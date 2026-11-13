import { useState, type ChangeEvent } from 'react'
import type { Notebook, ImportPayload } from './api'
import { isTask, isGoal, isNote } from './storage'

const sourceKeys = { tasks: 'cuaderno-tasks', goals: 'cuaderno-goals', notes: 'cuaderno-notes' }
function validate(value: unknown): Notebook {
  if (typeof value !== 'object' || value === null) throw new Error('La copia no tiene el formato de Cuaderno.')
  const source = value as Record<string, unknown>
  if (!Array.isArray(source.tasks) || !source.tasks.every(isTask)
    || !Array.isArray(source.goals) || !source.goals.every(isGoal)
    || !Array.isArray(source.notes) || !source.notes.every(isNote)) throw new Error('La copia contiene datos no válidos. Se conserva sin cambios; no se importará automáticamente.')
  return { tasks: source.tasks, goals: source.goals, notes: source.notes }
}
function localCopy() {
  const raw: Record<string, string | null> = {}
  try {
    for (const [name, key] of Object.entries(sourceKeys)) raw[name] = localStorage.getItem(key)
    return { raw, data: validate(Object.fromEntries(Object.entries(raw).map(([name, value]) => [name, value === null ? [] : JSON.parse(value)]))), error: '' }
  } catch (error) { return { raw, data: null, error: error instanceof Error ? error.message : 'No se pudo leer la copia local.' } }
}
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const total = (data: Notebook | null) => data ? data.tasks.length + data.goals.length + data.notes.length : 0
async function payloadFor(source: Notebook): Promise<ImportPayload> {
  // Proyección estable: el mismo contenido conserva su clave aunque se reordenen propiedades/listas.
  const data: Notebook = {
    tasks: source.tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, time: t.time, project: t.project, color: t.color, done: t.done, ...(t.weeklyGoalId ? { weeklyGoalId: t.weeklyGoalId } : {}) })).sort((a,b) => a.id - b.id),
    goals: source.goals.map(g => ({ id: g.id, title: g.title, period: g.period, periodKey: g.periodKey, ...(g.parentId ? { parentId: g.parentId } : {}) })).sort((a,b) => a.id.localeCompare(b.id)),
    notes: source.notes.map(n => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, categoryType: n.categoryType, category: n.category, createdAt: n.createdAt })).sort((a,b) => a.id.localeCompare(b.id)),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  if (bytes.length > 5 * 1024 * 1024) throw new Error('La copia supera el máximo de importación de 5 MB.')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return { ...data, importKey: Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('') }
}

type Props = { data: Notebook | null; disabled: boolean; onImport: (payload: ImportPayload) => Promise<boolean> }
export default function LocalImport({ disabled, onImport, data }: Props) {
  const [local] = useState(localCopy)
  const [source, setSource] = useState<Notebook | null>(local.data)
  const [sourceName, setSourceName] = useState('Este navegador')
  const [error, setError] = useState(local.error)
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState('')
  const [imported, setImported] = useState(false)
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setStatus(''); setImported(false); setSource(null); setSourceName(file.name)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera los 10 MB.')
      const parsed = JSON.parse(await file.text())
      setSource(validate(parsed.snapshot ?? parsed))
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo abrir la copia.') }
  }
  const migrate = async () => {
    if (!source || working || disabled) return
    setWorking(true); setError(''); setStatus('')
    try {
      const payload = await payloadFor(source)
      if (await onImport(payload)) {
        setImported(true)
        setStatus('Importación confirmada. Los datos están en el servidor y la copia del navegador se conserva intacta.')
      } else setError('No se pudo confirmar la importación. La copia local se conserva; puedes volver a intentarlo sin duplicar esta misma copia.')
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo preparar la importación.') }
    finally { setWorking(false) }
  }
  return <section className="json-transfer" aria-label="Importar y exportar copias">
    <p>{total(local.data) > 0 && !imported ? `Tienes ${total(local.data)} entradas guardadas en este navegador.` : 'Importa una copia JSON o exporta tu cuaderno actual.'}</p>
    <p>Esta copia se añadirá a la cuenta con la que has iniciado sesión. Revisa que sea la cuenta correcta antes de importar. Los datos del navegador se conservan; repetir la misma copia no crea duplicados.</p>
    <p className="import-source">Origen: {sourceName}</p>
    {source && <p>{source.tasks.length} tareas · {source.goals.length} objetivos · {source.notes.length} notas e ideas</p>}
    <div className="import-actions">
      <button type="button" className="text-button" disabled={!data} onClick={() => download({ format: 'cuaderno-local-v1', exportedAt: new Date().toISOString(), snapshot: data }, 'cuaderno-copia-cuenta.json')}>Exportar mi cuaderno</button>
      <button type="button" className="text-button" onClick={() => download({ format: 'cuaderno-local-v1', exportedAt: new Date().toISOString(), ...(local.data ? { snapshot: local.data } : {}), raw: local.raw }, 'cuaderno-copia-local.json')}>Exportar copia local</button>
      <label className="import-file-label">Abrir copia JSON<input type="file" accept="application/json,.json" disabled={working} onChange={event => { void selectFile(event) }}/></label>
      <button type="button" className="primary-button" disabled={disabled || working || !source || !total(source) || imported} onClick={() => { void migrate() }}>{working ? 'Importando…' : 'Importar al servidor'}</button>
    </div>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    <p role="status">{status}</p>
  </section>
}
