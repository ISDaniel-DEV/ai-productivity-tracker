import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { weekKey, type Task, type TaskDraft, type Goal } from './tasks'

type Props = { task: Task; goals: Goal[]; blocked: boolean; onSave: (id: number, draft: TaskDraft) => Promise<boolean>; onClose: () => void }
export default function TaskEditor({ task, goals, blocked, onSave, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(task.title)
  const [date, setDate] = useState(task.dueDate)
  const [time, setTime] = useState(task.time === 'Sin hora' ? '' : task.time)
  const [goal, setGoal] = useState(task.weeklyGoalId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving || blocked || !title.trim()) return
    setSaving(true); setError('')
    const saved = await onSave(task.id, { title: title.trim(), dueDate: date, time: time || 'Sin hora', ...(goal ? { weeklyGoalId: goal } : {}) })
    setSaving(false)
    if (saved) onClose()
    else setError('No se pudo guardar. Conservamos los cambios para que puedas reintentarlo.')
  }
  return <dialog ref={dialog} className="goal-dialog" aria-labelledby="edit-task-title" onClose={onClose} onCancel={event => { if (saving) event.preventDefault() }}>
    <div className="dialog-heading"><h2 id="edit-task-title">Editar tarea</h2><button type="button" className="dialog-close" aria-label="Cerrar edición de tarea" disabled={saving} onClick={onClose}><X size={20} aria-hidden="true"/></button></div>
    <form className="entry-form" aria-busy={saving} onSubmit={submit}>
      <label htmlFor="edit-task-name">Tarea (obligatorio)</label><input autoFocus id="edit-task-name" required pattern=".*\S.*" maxLength={240} disabled={saving} value={title} onChange={event => setTitle(event.target.value)}/>
      <div className="date-time-fields"><div><label htmlFor="edit-task-date">Día (obligatorio)</label><input id="edit-task-date" type="date" required disabled={saving} value={date} onChange={event => { const next = event.target.value; if (next && weekKey(next) !== weekKey(date)) setGoal(''); setDate(next) }}/></div>
        <div><label htmlFor="edit-task-time">Hora (opcional)</label><input id="edit-task-time" type="time" disabled={saving} value={time} onChange={event => setTime(event.target.value)}/></div></div>
      <label htmlFor="edit-task-goal">Objetivo semanal (opcional)</label><select id="edit-task-goal" disabled={saving} value={goal} onChange={event => setGoal(event.target.value)}><option value="">Tarea independiente</option>{goals.filter(item => item.period === 'week' && item.periodKey === weekKey(date)).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <p className="form-hint">Elige «Tarea independiente» para desenlazarla. Al cambiar de semana se retira el vínculo anterior.</p>
      {error && <p role="alert" className="dialog-error">{error}</p>}
      <div className="form-actions"><button type="button" className="text-button" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || blocked}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </dialog>
}
