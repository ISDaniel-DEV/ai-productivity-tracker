import { addDays, dateKey, parseDate, type Task } from './tasks'

type Props = { tasks: Task[]; visibleWeek: string }
export default function WeeklyRhythm({ tasks, visibleWeek }: Props) {
  const first = parseDate(visibleWeek)
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(first, index)
    return { date, key: dateKey(date), count: 0 }
  })
  const byDate = new Map(days.map(day => [day.key, day]))
  for (const task of tasks) {
    const day = byDate.get(task.dueDate)
    if (day) day.count++
  }
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const maximum = Math.max(1, ...days.map(day => day.count))
  const range = `${first.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${days[6].date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const description = days.map(day => `${day.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}: ${day.count} ${day.count === 1 ? 'tarea' : 'tareas'}`).join('; ')
  return <section className="rhythm-panel" aria-labelledby="rhythm-title">
    <div className="panel-heading"><h2 id="rhythm-title">Ritmo semanal</h2></div>
    <p className="panel-description">Cantidad de tareas por día</p>
    <p className="rhythm-range">{range}</p>
    <div className="rhythm-chart" role="img" aria-label={`${range}. ${description}. Incluye las tareas completadas.`}>
      {days.map((day, index) => <div className="rhythm-day" key={day.key} title={`${day.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}: ${day.count} ${day.count === 1 ? 'tarea' : 'tareas'}`}>
        <span className="rhythm-count">{day.count}</span>
        <div className="rhythm-track"><div className="rhythm-bar" data-peak={day.count > 0 && day.count === maximum} style={{ height: `${day.count / maximum * 100}%` }}/></div>
        <span>{['L', 'M', 'X', 'J', 'V', 'S', 'D'][index]}</span>
      </div>)}
    </div>
    <p className="panel-note">{total ? `${total} ${total === 1 ? 'tarea' : 'tareas'} esta semana. Incluye las completadas.` : 'No hay tareas esta semana.'}</p>
  </section>
}
