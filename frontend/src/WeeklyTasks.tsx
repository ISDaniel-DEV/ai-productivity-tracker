import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react'
import { addDays, dateKey, startOfWeek, type Task } from './tasks'

type Props = {
  tasks: Task[]
  onToggle: (id: number) => void
  onAdd: (title: string, date: string) => void
}

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function WeeklyTasks({ tasks, onToggle, onAdd }: Props) {
  const today = new Date()
  const todayKey = dateKey(today)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftDate, setDraftDate] = useState(todayKey)
  const firstDay = addDays(startOfWeek(today), weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, index) => addDays(firstDay, index))
  const weekTasks = tasks.filter(task => task.dueDate >= dateKey(firstDay) && task.dueDate <= dateKey(days[6]))
  const pendingCount = weekTasks.filter(task => !task.done).length
  const range = `${firstDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const changeWeek = (offset: number) => { setWeekOffset(offset); setSelectedDate(null) }
  const visibleDays = selectedDate ? days.filter(day => dateKey(day) === selectedDate) : days
  const hasTasks = weekTasks.some(task => !selectedDate || task.dueDate === selectedDate)
  const beginCreate = (date: string) => { setDraftDate(date); setShowAdd(true) }
  const addTask = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.trim()) return
    onAdd(draft.trim(), draftDate)
    const [year, month, day] = draftDate.split('-').map(Number)
    const taskWeek = startOfWeek(new Date(year, month - 1, day))
    // Count calendar weeks in UTC so daylight-saving shifts do not affect navigation.
    const currentWeek = startOfWeek(today)
    setWeekOffset(Math.round((Date.UTC(taskWeek.getFullYear(), taskWeek.getMonth(), taskWeek.getDate()) - Date.UTC(currentWeek.getFullYear(), currentWeek.getMonth(), currentWeek.getDate())) / 604800000))
    setSelectedDate(draftDate)
    setDraft(''); setShowAdd(false)
  }

  return <section className="weekly-tasks-card" aria-labelledby="weekly-heading">
    <div className="section-heading weekly-heading">
      <div><span className="eyebrow">TU PLAN DE LA SEMANA</span><h1 id="weekly-heading">Tareas semanales</h1></div>
      <button className="weekly-create" aria-label={showAdd ? 'Cerrar formulario' : 'Añadir tarea'} onClick={() => showAdd ? setShowAdd(false) : beginCreate(selectedDate ?? (weekOffset === 0 ? todayKey : dateKey(firstDay)))}>{showAdd ? <X size={15}/> : <Plus size={15}/>}<span>{showAdd ? 'Cerrar' : 'Añadir tarea'}</span></button>
    </div>
    {showAdd && <form className="add-task-form weekly-add-form" onSubmit={addTask}><input autoFocus required aria-label="Título de la tarea" value={draft} onChange={event => setDraft(event.target.value)} placeholder="¿Qué tienes en mente?"/><label className="task-date-label">Fecha<input type="date" required value={draftDate} onChange={event => setDraftDate(event.target.value)}/></label><button type="submit" aria-label="Guardar tarea"><Plus size={17}/></button></form>}
    <div className="weekly-toolbar">
      <span className="weekly-range">{range}</span>
      <div className="weekly-navigation"><button aria-label="Semana anterior" onClick={() => changeWeek(weekOffset - 1)}><ArrowLeft size={15}/></button><button className="weekly-reset" onClick={() => changeWeek(0)}>Esta semana</button><button aria-label="Semana siguiente" onClick={() => changeWeek(weekOffset + 1)}><ArrowRight size={15}/></button></div>
    </div>
    <div className="weekly-days" aria-label="Filtrar tareas por día">{days.map((day, index) => {
      const key = dateKey(day)
      const count = weekTasks.filter(task => task.dueDate === key).length
      return <button key={key} aria-pressed={selectedDate === key} className={`weekly-day ${key === todayKey ? 'is-today' : ''} ${selectedDate === key ? 'is-selected' : ''}`} onClick={() => setSelectedDate(selectedDate === key ? null : key)}><span>{dayNames[index]}</span><strong>{day.getDate()}</strong><small>{count} {count === 1 ? 'tarea' : 'tareas'}</small></button>
    })}</div>
    <div className="weekly-summary"><button className={selectedDate === null ? 'is-active' : ''} onClick={() => setSelectedDate(null)}>Toda la semana</button><span>{pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}</span></div>
    <div className="weekly-task-list">{hasTasks ? visibleDays.map(day => {
      const key = dateKey(day)
      const dayTasks = weekTasks.filter(task => task.dueDate === key)
      if (dayTasks.length === 0) return null
      return <div className="weekly-day-group" key={key}><h2>{day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}{key === todayKey && <span>Hoy</span>}</h2><ul>{dayTasks.map(task => <li className={task.done ? 'is-complete' : ''} key={task.id}><button className={`task-check ${task.done ? 'checked' : ''}`} aria-label={`${task.done ? 'Marcar pendiente' : 'Completar'}: ${task.title}`} onClick={() => onToggle(task.id)}>{task.done && <Check size={13}/>}</button><span className="weekly-task-title">{task.title}</span><span className="weekly-task-time">{task.time}</span></li>)}</ul></div>
    }) : <p className="weekly-empty">{selectedDate ? 'No hay tareas para este día.' : 'No hay tareas para esta semana.'} <button onClick={() => beginCreate(selectedDate ?? dateKey(firstDay))}>Añadir una tarea</button></p>}</div>
  </section>
}
