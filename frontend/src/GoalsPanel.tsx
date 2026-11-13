import { useRef, useState, type FormEvent } from 'react'
import TaskActions from './TaskActions'
import GoalDeletionDialog from './GoalDeletionDialog'
import { Plus, X, Target } from 'lucide-react'
import { monthKeysForWeek, monthLabel, parseDate, type Goal } from './tasks'

type Props = { onDelete: (id: string, token: string, confirmationText: string, onConfirmed?: () => void) => Promise<boolean>; selectedGoalId: string | null; onSelectGoal: (id: string) => void; goals: Goal[]; visibleWeek: string; blocked: boolean; onAdd: (goal: Omit<Goal, 'id'>) => Promise<boolean> }

export default function GoalsPanel(props: Props) {
  // A changed week starts a fresh form, so its period cannot silently drift.
  return <GoalsForWeek key={props.visibleWeek} {...props}/>
}

function GoalsForWeek({ goals, visibleWeek, onAdd, blocked, selectedGoalId, onSelectGoal, onDelete }: Props) {
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [title, setTitle] = useState('')
  const months = monthKeysForWeek(visibleWeek)
  const [month, setMonth] = useState(months[0])
  const [parentId, setParentId] = useState('')
  const [status, setStatus] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const [saveError, setSaveError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const monthlyGoals = goals.filter(goal => goal.period === 'month' && months.includes(goal.periodKey))
  const weeklyGoals = goals.filter(goal => goal.period === 'week' && goal.periodKey === visibleWeek)
  const close = () => dialog.current?.close()
  const open = (kind: 'week' | 'month', monthKey = months[0]) => {
    setPeriod(kind)
    setMonth(monthKey)
    setTitle('')
    setParentId('')
    setSaveError('')
    dialog.current?.showModal()
    input.current?.focus()
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { input.current?.focus(); return }
    if (submitting || blocked) return
    setSubmitting(true); setSaveError('')
    const saved = await onAdd({ title: title.trim(), period, periodKey: period === 'week' ? visibleWeek : month,
      ...(period === 'week' && parentId ? { parentId } : {}) })
    setSubmitting(false)
    if (saved) { setStatus(`Objetivo añadido: ${title.trim()}`); setTitle(''); close() }
    else setSaveError('No se pudo guardar el objetivo. Conservamos el texto; comprueba la conexión con el servidor e inténtalo de nuevo.')
  }
  return <section className="goals-panel" id="objetivos" aria-labelledby="goals-title">
    <div className="panel-heading"><h2 id="goals-title" tabIndex={-1}>Objetivos</h2></div>
    <dialog ref={dialog} className="goal-dialog" aria-labelledby="goal-dialog-title">
      <div className="dialog-heading"><h2 id="goal-dialog-title">Nuevo objetivo {period === 'month' ? 'mensual' : 'semanal'}</h2>
        <button type="button" className="dialog-close" aria-label="Cerrar formulario de objetivo" onClick={close}><X size={20} aria-hidden="true"/></button>
      </div>
      <p className="panel-description">{period === 'month' ? monthLabel(month) : `Semana del ${parseDate(visibleWeek).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}</p>
      <form className="entry-form goal-form" aria-busy={submitting} aria-labelledby="goal-dialog-title" onSubmit={submit}>
        <label htmlFor="goal-title-input">Objetivo (obligatorio)</label>
        <input disabled={submitting} ref={input} autoFocus id="goal-title-input" name="goal-title" value={title} onChange={event => setTitle(event.target.value)} required pattern=".*\S.*" maxLength={180} placeholder="¿Qué quieres conseguir?"/>
        {period === 'week' && <>
          <label htmlFor="goal-parent">Objetivo mensual (opcional)</label><select disabled={submitting} id="goal-parent" name="goal-parent" value={parentId} onChange={event => setParentId(event.target.value)}>
            <option value="">Independiente</option>{monthlyGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.title} · {monthLabel(goal.periodKey)}</option>)}
          </select>
          {monthlyGoals.length === 0 && <p className="form-hint">Puedes crear primero un objetivo mensual o dejar este independiente.</p>}
        </>}
        {saveError && <p className="dialog-error" role="alert">{saveError}</p>}
        <div className="form-actions"><button type="button" className="text-button" onClick={close}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting || blocked}>{submitting ? 'Guardando…' : 'Guardar objetivo'}</button></div>
      </form>
    </dialog>
    <h3 className="goal-period-heading">Del mes</h3>
    {months.map(key => {
      const entries = monthlyGoals.filter(goal => goal.periodKey === key)
      return <details className="monthly-goals" key={key}>
        <summary><span>{monthLabel(key)}</span><span className="goal-count">{entries.length}</span></summary>
        {entries.length ? <ul>{entries.map(goal => <li key={goal.id} data-goal-id={goal.id}><button type="button" className="goal-filter-button" aria-pressed={selectedGoalId === goal.id} onClick={() => onSelectGoal(goal.id)}><Target size={15} aria-hidden="true"/><span>{goal.title}</span></button><TaskActions entity="goal" title={goal.title} disabled={blocked} onDelete={() => setDeleting(goal)}/></li>)}</ul>
          : <p className="panel-note">Aún no hay objetivos para este mes.</p>}
        <button className="add-goal-row" type="button" disabled={blocked} aria-label={`Añadir objetivo mensual para ${monthLabel(key)}`} onClick={() => open('month', key)}><Plus size={19} aria-hidden="true"/></button>
      </details>
    })}
    <h3 className="goal-period-heading">De esta semana</h3>
    {weeklyGoals.length ? <ul className="weekly-goals">{weeklyGoals.map(goal => {
      const parent = goals.find(item => item.id === goal.parentId)
      return <li key={goal.id} data-goal-id={goal.id}><button type="button" className="goal-filter-button" aria-pressed={selectedGoalId === goal.id} onClick={() => onSelectGoal(goal.id)}><Target size={17} aria-hidden="true"/><span><span>{goal.title}</span><small>{parent ? `Del mes: ${parent.title}` : 'Objetivo independiente'}</small></span></button><TaskActions entity="goal" title={goal.title} disabled={blocked} onDelete={() => setDeleting(goal)}/></li>
    })}</ul> : <p className="panel-note">Añade un objetivo semanal para relacionar tus tareas, o déjalas independientes.</p>}
    <button className="add-goal-row" type="button" disabled={blocked} aria-label="Añadir objetivo semanal" onClick={() => open('week')}><Plus size={19} aria-hidden="true"/></button>
    {deleting && <GoalDeletionDialog goal={deleting} blocked={blocked} onDelete={onDelete} onClose={() => { setDeleting(null); document.getElementById('goals-title')?.focus({ preventScroll: true }) }}/>}
    <p className="sr-only" role="status">{status}</p>
  </section>
}
