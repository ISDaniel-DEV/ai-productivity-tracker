import { animateConfirmedTaskChange, animateConfirmedRemoval } from './taskMotion'
import { csrfHeaders, accountHeader, expiredSession } from './auth'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isTask, isGoal, isNote } from './storage'
import type { Task, TaskDraft, Goal } from './tasks'
import type { Note, NoteDraft } from './notes'

export type Notebook = { tasks: Task[]; goals: Goal[]; notes: Note[] }
export type GoalDeletionPlan = { id: string; title: string; goalIds: string[]; taskIds: number[]; confirmationToken: string }
export async function previewGoalDeletion(id: string): Promise<GoalDeletionPlan> {
  const value = await request(`/goals/${encodeURIComponent(id)}/deletion-preview`)
  if (!object(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.confirmationToken !== 'string'
    || !Array.isArray(value.goalIds) || !value.goalIds.every(id => typeof id === 'string') || !Array.isArray(value.taskIds) || !value.taskIds.every(id => typeof id === 'number')) throw new Error('No se pudo comprobar qué elementos se eliminarán.')
  return value as GoalDeletionPlan
}
export type ImportPayload = Notebook & { importKey: string }
class ApiError extends Error { constructor(message: string, readonly status: number) { super(message) } }

async function request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { Accept: 'application/json', ...accountHeader(), ...(method === 'GET' ? {} : await csrfHeaders()), ...(method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Cuaderno-Request': '1' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      if (response.status === 401) expiredSession()
      const problem = await response.json().catch(() => null)
      throw new ApiError(typeof problem?.detail === 'string' ? problem.detail : `El servidor no pudo completar la operación (${response.status}).`, response.status)
    }
    if (response.status === 204) return undefined
    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new Error(controller.signal.aborted
      ? 'El servidor tardó demasiado. No se ha confirmado el cambio; recarga antes de repetir.'
      : 'No se pudo conectar con el servidor. Conserva tu borrador y vuelve a intentarlo cuando haya conexión.')
  } finally { window.clearTimeout(timer) }
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
function task(value: unknown): Task {
  if (!object(value)) throw new Error('El servidor devolvió una tarea no válida.')
  const normalized = { ...value, weeklyGoalId: value.weeklyGoalId ?? undefined }
  if (!isTask(normalized)) throw new Error('El servidor devolvió una tarea no válida.')
  return normalized
}
function goal(value: unknown): Goal {
  if (!object(value)) throw new Error('El servidor devolvió un objetivo no válido.')
  const normalized = { ...value, parentId: value.parentId ?? undefined }
  if (!isGoal(normalized)) throw new Error('El servidor devolvió un objetivo no válido.')
  return normalized
}
function note(value: unknown): Note {
  if (!isNote(value)) throw new Error('El servidor devolvió una nota no válida.')
  return value
}
function notebook(value: unknown): Notebook {
  if (!object(value) || !Array.isArray(value.tasks) || !Array.isArray(value.goals) || !Array.isArray(value.notes)) throw new Error('La respuesta del cuaderno no es válida.')
  return { tasks: value.tasks.map(task), goals: value.goals.map(goal), notes: value.notes.map(note) }
}
const upsert = <T extends { id: string | number }>(items: T[], item: T) => items.some(old => old.id === item.id)
  ? items.map(old => old.id === item.id ? item : old) : [...items, item]

export function useNotebook() {
  const [data, setData] = useState<Notebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [writeError, setWriteError] = useState('')
  const dataRef = useRef<Notebook | null>(null)
  const busyRef = useRef(false)
  const live = useRef(true)
  const generation = useRef(0)
  const keys = useRef(new Map<string, string>())
  const commit = (change: (previous: Notebook) => Notebook) => {
    if (!dataRef.current) return
    const next = change(dataRef.current)
    dataRef.current = next
    setData(next)
  }
  const refresh = useCallback(async () => {
    if (busyRef.current) return false
    const ticket = ++generation.current
    try {
      const next = notebook(await request('/notebook'))
      if (live.current && ticket === generation.current) { dataRef.current = next; setData(next); setLoadError(''); setWriteError('') }
      return true
    } catch (error) {
      if (live.current && ticket === generation.current) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el cuaderno.')
      return false
    } finally { if (live.current && ticket === generation.current) setLoading(false) }
  }, [])
  useEffect(() => {
    live.current = true
    void refresh()
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(visibleRefresh, 30000)
    window.addEventListener('focus', visibleRefresh)
    window.addEventListener('online', visibleRefresh)
    document.addEventListener('visibilitychange', visibleRefresh)
    return () => { live.current = false; ++generation.current; clearInterval(timer); window.removeEventListener('focus', visibleRefresh); window.removeEventListener('online', visibleRefresh); document.removeEventListener('visibilitychange', visibleRefresh) }
  }, [refresh])
  const write = async (operation: () => Promise<void>) => {
    if (busyRef.current || !dataRef.current || loadError) return false
    busyRef.current = true; ++generation.current; setBusy(true); setWriteError('')
    try { await operation(); return true }
    catch (error) { setWriteError(error instanceof Error ? error.message : 'No se pudo guardar el cambio.'); return false }
    finally { busyRef.current = false; setBusy(false) }
  }
  const requestKey = (collection: string, payload: unknown) => {
    const signature = `${collection}:${JSON.stringify(payload)}`
    if (!keys.current.has(signature)) keys.current.set(signature, crypto.randomUUID())
    return { signature, requestKey: keys.current.get(signature)! }
  }
  const addTask = (draft: TaskDraft, onConfirmed?: (saved: Task) => void) => write(async () => {
    const key = requestKey('tasks', draft)
    const saved = task(await request('/tasks', 'POST', { ...draft, requestKey: key.requestKey }))
    await animateConfirmedTaskChange(() => { commit(previous => ({ ...previous, tasks: upsert(previous.tasks, saved) })); onConfirmed?.(saved) }); keys.current.delete(key.signature)
  })
  const addGoal = (draft: Omit<Goal, 'id'>) => write(async () => {
    const key = requestKey('goals', draft)
    const saved = goal(await request('/goals', 'POST', { ...draft, requestKey: key.requestKey }))
    commit(previous => ({ ...previous, goals: upsert(previous.goals, saved) })); keys.current.delete(key.signature)
  })
  const addNote = (draft: NoteDraft) => write(async () => {
    const key = requestKey('notes', draft)
    const saved = note(await request('/notes', 'POST', { ...draft, requestKey: key.requestKey }))
    commit(previous => ({ ...previous, notes: upsert(previous.notes, saved) })); keys.current.delete(key.signature)
  })
  const toggleTask = (id: number) => write(async () => {
    const current = dataRef.current?.tasks.find(item => item.id === id)
    if (!current) throw new Error('La tarea ya no está disponible. Recarga el cuaderno.')
    const saved = task(await request(`/tasks/${id}`, 'PATCH', { done: !current.done }))
    commit(previous => ({ ...previous, tasks: upsert(previous.tasks, saved) }))
  })
  const deleteTask = (id: number) => write(async () => {
    try { await request(`/tasks/${id}`, 'DELETE') }
    catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error }
    await animateConfirmedRemoval([], [id], () => commit(previous => ({ ...previous, tasks: previous.tasks.filter(item => item.id !== id) })))
  })
  const editTask = (id: number, draft: TaskDraft) => write(async () => {
    const saved = task(await request(`/tasks/${id}`, 'PUT', { ...draft, weeklyGoalId: draft.weeklyGoalId ?? null }))
    commit(previous => ({ ...previous, tasks: upsert(previous.tasks, saved) }))
  })
  const unlinkTask = (id: number) => write(async () => {
    const saved = task(await request(`/tasks/${id}/goal`, 'DELETE'))
    commit(previous => ({ ...previous, tasks: upsert(previous.tasks, saved) }))
  })
  const deleteGoal = (id: string, confirmationToken: string, confirmationText: string, onConfirmed?: () => void) => write(async () => {
    try {
      const removed = await request(`/goals/${encodeURIComponent(id)}`, 'DELETE', { confirmationToken, confirmationText })
      if (!object(removed) || !Array.isArray(removed.goalIds) || !removed.goalIds.every(id => typeof id === 'string') || !Array.isArray(removed.taskIds) || !removed.taskIds.every(id => typeof id === 'number')) throw new Error('No se pudo confirmar el contenido eliminado. Actualiza el cuaderno.')
      const goalIds = removed.goalIds; const taskIds = removed.taskIds
      await animateConfirmedRemoval(goalIds, taskIds, () => commit(previous => ({ ...previous, goals: previous.goals.filter(goal => !goalIds.includes(goal.id)), tasks: previous.tasks.filter(task => !taskIds.includes(task.id)) })), onConfirmed)
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error
      const next = notebook(await request('/notebook'))
      const goalIds = dataRef.current?.goals.filter(goal => !next.goals.some(item => item.id === goal.id)).map(goal => goal.id) ?? []
      const taskIds = dataRef.current?.tasks.filter(task => !next.tasks.some(item => item.id === task.id)).map(task => task.id) ?? []
      await animateConfirmedRemoval(goalIds, taskIds, () => { dataRef.current = next; setData(next) }, onConfirmed)
    }
  })
  const importLocal = (payload: ImportPayload) => write(async () => {
    await request('/imports/local', 'POST', payload)
    const next = notebook(await request('/notebook'))
    dataRef.current = next; setData(next)
  })
  return { data, loading, busy, blocked: !data || busy || Boolean(loadError), error: loadError || writeError,
    refresh, addTask, addGoal, addNote, toggleTask, deleteTask, editTask, unlinkTask, deleteGoal, importLocal }
}
