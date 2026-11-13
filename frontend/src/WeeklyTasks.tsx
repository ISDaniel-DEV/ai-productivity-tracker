import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, X, ListFilter, ChevronDown } from 'lucide-react'
import TaskActions from './TaskActions'
import TaskEditor from './TaskEditor'
import WeekNavigator from './WeekNavigator'
import { animateTaskChange } from './taskMotion'
import { addDays, dateKey, parseDate, weekKey, type Task, type Goal, type TaskDraft } from './tasks'

type Props = {
  selectedGoal: Goal | null
  onClearGoal: (animate?: boolean) => void
  onSelectGoal: (id: string | null) => void
  tasks: Task[]
  goals: Goal[]
  visibleWeek: string
  onWeekChange: (key: string) => void
  onEdit: (id: number, draft: TaskDraft) => Promise<boolean>
  onUnlink: (id: number) => Promise<boolean>
  onToggle: (id: number) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
  onAdd: (draft: TaskDraft, onConfirmed: (saved: Task) => void) => Promise<boolean>
  blocked: boolean
}

export default function WeeklyTasks({ tasks, goals, visibleWeek, onWeekChange, onToggle, onDelete, onAdd, blocked, selectedGoal, onClearGoal, onSelectGoal, onEdit, onUnlink }: Props) {
  const [newTaskId, setNewTaskId] = useState<number | null>(null)
  useEffect(() => {
    if (newTaskId === null) return
    const timer = window.setTimeout(() => setNewTaskId(null), 1000)
    return () => window.clearTimeout(timer)
  }, [newTaskId])
  const [editing, setEditing] = useState<Task | null>(null)
  const todayKey = dateKey(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftDate, setDraftDate] = useState(todayKey)
  const [time, setTime] = useState('')
  const [goalId, setGoalId] = useState('')
  const [status, setStatus] = useState('')
  const [deletionNotice, setDeletionNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const firstDay = parseDate(visibleWeek)
  const days = Array.from({ length: 7 }, (_, index) => addDays(firstDay, index))
  useEffect(() => { setSelectedDate(null) }, [selectedGoal?.id])
  const relatedGoalIds = new Set(selectedGoal
    ? selectedGoal.period === 'week' ? [selectedGoal.id] : goals.filter(goal => goal.parentId === selectedGoal.id && goal.period === 'week').map(goal => goal.id)
    : [])
  const matchesGoal = (task: { weeklyGoalId?: string }) => !selectedGoal || Boolean(task.weeklyGoalId && relatedGoalIds.has(task.weeklyGoalId))
  const weekTasks = tasks.filter(task => task.dueDate >= visibleWeek && task.dueDate <= dateKey(days[6]) && matchesGoal(task))
  const pendingCount = weekTasks.filter(task => !task.done).length
  const availableGoals = goals.filter(goal => goal.period === 'week' && goal.periodKey === weekKey(draftDate))
  const activeDate = selectedDate && weekKey(selectedDate) === visibleWeek ? selectedDate : null
  const visibleDays = activeDate ? days.filter(day => dateKey(day) === activeDate) : days
  const hasTasks = weekTasks.some(task => !activeDate || task.dueDate === activeDate)
  const close = () => { setShowAdd(false); trigger.current?.focus() }
  const beginCreate = (date: string) => { setDraftDate(date); setGoalId(''); setStatus(''); setShowAdd(true) }
  const addTask = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) { titleInput.current?.focus(); return }
    if (submitting || blocked) return
    setSubmitting(true); setSaveError('')
    let createdId: number | null = null
    const saved = await onAdd({ title: draft.trim(), dueDate: draftDate, time: time || 'Sin hora', ...(goalId ? { weeklyGoalId: goalId } : {}) }, created => {
      createdId = created.id
      if (!matchesGoal(created)) onClearGoal(false)
      onWeekChange(weekKey(created.dueDate))
      setSelectedDate(created.dueDate)
      setShowAdd(false)
      setNewTaskId(created.id)
      setStatus(`Añadida para el ${parseDate(created.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}: ${created.title}`)
      setDraft(''); setTime(''); setGoalId('')
    })
    setSubmitting(false)
    if (saved && createdId !== null) {
      const row = document.getElementById(`task-row-${createdId}`)
      row?.focus({ preventScroll: true })
      row?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    } else if (!saved) setSaveError('No se pudo guardar la tarea. Conservamos el borrador; comprueba la conexión y vuelve a intentarlo.')
  }

  return <section className="tasks-panel" aria-labelledby="tareas">
    <div className="task-panel-heading"><div><h1 id="tareas" tabIndex={-1}>Tu semana</h1><p className="panel-description">Un día a la vez.</p></div>
      <button ref={trigger} className="primary-button" type="button" disabled={blocked} aria-expanded={showAdd} aria-controls="task-form"
        onClick={() => showAdd ? close() : beginCreate(activeDate ?? (weekKey(todayKey) === visibleWeek ? todayKey : visibleWeek))}>
        {showAdd ? <X size={17} aria-hidden="true"/> : <Plus size={17} aria-hidden="true"/>}{showAdd ? 'Cerrar' : 'Añadir tarea'}
      </button>
    </div>
    <WeekNavigator visibleWeek={visibleWeek} tasks={tasks.filter(matchesGoal)} selectedDate={activeDate}
      onWeekChange={week => { onWeekChange(week); setSelectedDate(null) }}
      onDateChange={date => animateTaskChange(() => setSelectedDate(date))}/>
    {showAdd && <form id="task-form" className="entry-form task-form" aria-busy={submitting} aria-label="Nueva tarea" onSubmit={addTask}>
      <label htmlFor="task-title">Tarea (obligatorio)</label><input disabled={submitting} ref={titleInput} autoFocus id="task-title" name="title" required pattern=".*\S.*" maxLength={240}
        value={draft} onChange={event => setDraft(event.target.value)} placeholder="¿Qué tienes que hacer?"/>
      <div className="date-time-fields"><div><label htmlFor="task-date">Día (obligatorio)</label><input disabled={submitting} id="task-date" name="date" type="date" required value={draftDate}
        onChange={event => { const next = event.target.value; if (next && weekKey(next) !== weekKey(draftDate)) setGoalId(''); setDraftDate(next) }}/></div>
        <div><label htmlFor="task-time">Hora (opcional)</label><input disabled={submitting} id="task-time" name="time" type="time" value={time} onChange={event => setTime(event.target.value)}/></div></div>
      <label htmlFor="task-goal">Objetivo semanal (opcional)</label><select disabled={submitting} id="task-goal" name="goal" value={goalId} onChange={event => setGoalId(event.target.value)} aria-describedby="task-goal-hint">
        <option value="">Tarea independiente</option>{availableGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
      </select>
      <p id="task-goal-hint" className="form-hint">{availableGoals.length ? 'Objetivos de la semana del día elegido.' : 'No hay objetivos para esta semana. Puedes añadir uno en Objetivos o guardar la tarea independiente.'}</p>
      <div className="form-actions"><button className="text-button" type="button" onClick={close}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting || blocked}>{submitting ? 'Guardando…' : 'Guardar tarea'}</button></div>
      {saveError && <p className="dialog-error" role="alert">{saveError}</p>}
    </form>}
    <div className="task-list-summary">
      <span className="task-pending-count" role="status" aria-label={`${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}${selectedGoal ? ' del objetivo' : ''} esta semana`}>{pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}</span>
      <div className="task-filter-control" data-active={Boolean(selectedGoal)}>
        <div className="task-filter-select">
        <ListFilter size={16} aria-hidden="true"/>
        <span className="task-filter-label" aria-hidden="true">{selectedGoal?.title ?? 'Objetivos'}</span>
        <ChevronDown size={14} aria-hidden="true"/>
        <select aria-label="Filtrar tareas por objetivo" value={selectedGoal?.id ?? ''} onChange={event => onSelectGoal(event.target.value || null)}>
          <option value="">Todos los objetivos</option>
          <optgroup label="Objetivos semanales">{goals.filter(goal => goal.period === 'week').map(goal => <option key={goal.id} value={goal.id}>{goal.title} · {parseDate(goal.periodKey).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</option>)}</optgroup>
          <optgroup label="Objetivos mensuales">{goals.filter(goal => goal.period === 'month').map(goal => <option key={goal.id} value={goal.id}>{goal.title} · {parseDate(`${goal.periodKey}-01`).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</option>)}</optgroup>
        </select>
        </div>
        {selectedGoal && <button type="button" className="clear-goal-filter" aria-label={`Quitar filtro de objetivo: ${selectedGoal.title}`} onClick={() => { onClearGoal(); document.getElementById('tareas')?.focus({ preventScroll: true }) }}><X size={16} aria-hidden="true"/></button>}
      </div>
    </div>
    <p className="sr-only" role="status">{status}</p>
    <p className="sr-only" role="status">{deletionNotice}</p>
    <div className="daily-task-list">{hasTasks ? visibleDays.map(day => {
      const key = dateKey(day)
      const dayTasks = weekTasks.filter(task => task.dueDate === key).sort((a, b) => a.time.localeCompare(b.time))
      if (!dayTasks.length) return null
      return <div className="day-group" key={key}><h2>{day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}{key === todayKey && <span>Hoy</span>}</h2>
        <ul>{dayTasks.map(task => {
          const goal = goals.find(item => item.id === task.weeklyGoalId)
          const parent = goals.find(item => item.id === goal?.parentId)
          return <li id={`task-row-${task.id}`} tabIndex={-1} data-task-id={task.id} data-new={newTaskId === task.id} style={{ viewTransitionName: `task-row-${task.id}` }} className={task.done ? 'is-complete' : ''} key={task.id}>
            <label className="task-checkbox" htmlFor={`task-${task.id}`}><input id={`task-${task.id}`} type="checkbox" checked={task.done} disabled={blocked} onChange={() => onToggle(task.id)}/><span className="sr-only">Completar: {task.title}</span></label>
            <div className="task-copy"><span className="task-name">{task.title}</span>
              {goal && <small className="task-goal-path">{goal.title}{parent && <> / {parent.title}</>}</small>}
              {!goal && task.weeklyGoalId && <small className="task-goal-path">Objetivo no disponible en este navegador</small>}
            </div>{task.time !== 'Sin hora' && <span className="task-hour">{task.time}</span>}
            <TaskActions title={task.title} disabled={blocked} onEdit={() => setEditing(task)} onUnlink={task.weeklyGoalId ? async () => {
              const saved = await onUnlink(task.id)
              if (saved) { setDeletionNotice(`Tarea desenlazada: ${task.title}`); document.getElementById('tareas')?.focus({ preventScroll: true }) }
              return saved
            } : undefined} onDelete={async () => {
              const saved = await onDelete(task.id)
              if (saved) {
                setDeletionNotice(`Tarea borrada: ${task.title}`)
                document.getElementById('tareas')?.focus()
              }
              return saved
            }}/>
          </li>
        })}</ul>
      </div>
    }) : <div className="empty-tasks"><p>{selectedGoal ? `No hay tareas de este objetivo ${activeDate ? 'en este día' : 'en esta semana'}.` : activeDate ? 'Este día está libre.' : 'Todavía no hay tareas para esta semana.'}</p>
      <button type="button" className="text-button" disabled={blocked} onClick={() => beginCreate(activeDate ?? visibleWeek)}>Añadir una tarea</button></div>}</div>
    {editing && <TaskEditor task={editing} goals={goals} blocked={blocked} onSave={async (id, draft) => {
      const saved = await onEdit(id, draft)
      if (saved) {
        if (!matchesGoal(draft)) onClearGoal()
        onWeekChange(weekKey(draft.dueDate)); setSelectedDate(draft.dueDate)
        setDeletionNotice(`Tarea actualizada: ${draft.title}`)
      }
      return saved
    }} onClose={() => { setEditing(null); document.getElementById('tareas')?.focus({ preventScroll: true }) }}/>}
  </section>
}
