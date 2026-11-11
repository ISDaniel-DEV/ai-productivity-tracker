import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, ChevronDown, Command, Ellipsis, Leaf, ListTodo, PanelLeftClose, PanelLeftOpen, PencilLine, Plus, Search, Sun } from 'lucide-react'
import WeeklyTasks from './WeeklyTasks'
import { addDays, dateKey, startOfWeek, type Task } from './tasks'

const initialTasks: Omit<Task, 'dueDate'>[] = [
  { id: 1, title: 'Terminar propuesta para el cliente', time: '09:30', project: 'Trabajo', color: 'sage', done: false },
  { id: 2, title: 'Revisar notas del proyecto', time: '11:00', project: 'Personal', color: 'peach', done: false },
  { id: 3, title: 'Paseo y un poco de aire fresco', time: '13:00', project: 'Bienestar', color: 'blue', done: false },
  { id: 4, title: 'Preparar ideas para la semana', time: '15:30', project: 'Trabajo', color: 'sage', done: false },
  { id: 5, title: 'Responder correos pendientes', time: 'A tu ritmo', project: 'Trabajo', color: 'sage', done: true },
]
const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function App() {
  const today = new Date()
  const [tasks, setTasks] = useState<Task[]>(() => {
    const fallback = initialTasks.map((task, index) => ({ ...task, dueDate: dateKey(addDays(startOfWeek(today), index)) }))
    try {
      const saved = localStorage.getItem('cuaderno-tasks')
      if (!saved) return fallback
      const stored = JSON.parse(saved) as (Omit<Task, 'dueDate'> & { dueDate?: string })[]
      return stored.map(task => ({ ...task, dueDate: task.dueDate || dateKey(today) }))
    } catch { return fallback }
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('cuaderno-sidebar-collapsed') === 'true' } catch { return false }
  })
  const [message, setMessage] = useState('')
  const [lastAddedTask, setLastAddedTask] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState('Mi día')
  const [greetingName] = useState('Daniel')


  useEffect(() => { localStorage.setItem('cuaderno-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('cuaderno-sidebar-collapsed', String(sidebarCollapsed)) }, [sidebarCollapsed])
  const toggleTask = (id: number) => setTasks(current => current.map(task => task.id === id ? { ...task, done: !task.done } : task))
  const addTask = (title: string, dueDate: string) => {
    setTasks(current => [{ id: Date.now(), title, time: 'Sin hora', project: 'Personal', color: 'peach', done: false, dueDate }, ...current])
  }
  const captureTask = (event: FormEvent) => {
    event.preventDefault()
    const title = message.trim()
    if (!title) return
    addTask(title, dateKey(new Date()))
    setLastAddedTask(title)
    setMessage('')
  }

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar" id="main-sidebar" hidden={sidebarCollapsed}>
      <a className="brand" href="#inicio" onClick={() => setActiveNav('Mi día')}><span className="brand-mark"><ListTodo size={19} strokeWidth={1.8} /></span><span>cuaderno<span className="brand-period">.</span></span></a>
      <button className="workspace-switch"><span className="workspace-avatar">D</span><span className="workspace-copy"><b>Mi espacio</b><small>Plan personal</small></span><ChevronDown size={15} /></button>
      <div className="nav-label">TU ESPACIO</div>
      <nav className="main-nav">
        {[['Mi día', Sun], ['Tareas', ListTodo], ['Objetivos', Leaf]].map(([label, Icon]) => {
          const title = label as string; const NavIcon = Icon as typeof Sun
          return <button key={title} className={`nav-item ${activeNav === title ? 'active' : ''}`} onClick={() => setActiveNav(title)}><NavIcon size={18} strokeWidth={1.8} />{title}{title === 'Tareas' && <span className="nav-count">{tasks.filter(task => !task.done).length}</span>}</button>
        })}
      </nav>
      <div className="nav-label project-label">TUS LISTAS <button aria-label="Añadir lista"><Plus size={15}/></button></div>
      <button className="nav-item"><span className="project-dot sage-dot"/>Trabajo</button>
      <button className="nav-item"><span className="project-dot peach-dot"/>Personal</button>
      <button className="nav-item"><span className="project-dot blue-dot"/>Bienestar</button>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-sun"><Sun size={16}/></span><p>Pequeños pasos,<br/><b>grandes días.</b></p><span className="note-flower">✳</span></div><button className="profile"><span className="profile-avatar">D</span><span><b>{greetingName} Sánchez</b><small>Plan gratuito</small></span><Ellipsis size={18} className="profile-more"/></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="topbar-leading"><button className="sidebar-toggle" aria-label={sidebarCollapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} title={sidebarCollapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'} aria-expanded={!sidebarCollapsed} aria-controls="main-sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button><div className="breadcrumbs">Mi espacio <span>/</span> <b>{activeNav}</b></div></div><div className="top-actions"><button className="search-button"><Search size={16}/><span>Buscar</span><kbd><Command size={11}/> K</kbd></button><button className="icon-button" aria-label="Notificaciones"><span className="notification-dot"/>✳</button><div className="top-avatar">D</div></div></header>

      <div className="dashboard-layout">
        <section className="primary-column">
          <WeeklyTasks tasks={tasks} onToggle={toggleTask} onAdd={addTask}/>

          <section className="chat-card" aria-labelledby="quick-capture-heading">
            <div className="chat-head"><div className="chat-icon"><PencilLine size={17}/></div><div><span className="eyebrow">UN MOMENTO PARA TI</span><h2 id="quick-capture-heading">Dime qué apunto</h2></div></div>
            <p className="chat-intro">Escríbelo y lo añado a tus tareas de hoy.</p>
            <form className="chat-input-wrap quick-capture-form" onSubmit={captureTask}><input aria-label="Tarea para hoy" value={message} onChange={event => setMessage(event.target.value)} placeholder="Ej.: llamar al dentista"/><button type="submit" disabled={!message.trim()}><Plus size={15}/>Apuntar</button></form>
            <div className="capture-status" role="status" aria-live="polite">{lastAddedTask && <><Check size={14}/><span>Apuntado para hoy: {lastAddedTask}</span></>}</div>
          </section>
        </section>

        <aside className="right-column">
          <section className="week-card"><div className="side-card-heading"><div><span className="eyebrow">RITMO SEMANAL</span><h2>Tu semana</h2></div><button className="week-expand" aria-label="Ver estadísticas"><ArrowUpRight size={15}/></button></div><div className="week-chart">{[35, 64, 48, 82, 58, 28, 20].map((height, index) => <div className="chart-day" key={weekDays[index]}><div className={`chart-bar ${index === (today.getDay() + 6) % 7 ? 'current' : ''}`} style={{ height: `${height}%` }}>{index === (today.getDay() + 6) % 7 && <span className="chart-bar-highlight"/>}</div><span>{weekDays[index]}</span></div>)}</div><div className="week-caption"><span className="caption-dot"/> Una semana con buen ritmo</div></section>

        </aside>
      </div>
      <footer className="page-footer"><span>HECHO CON CALMA <span>✳</span></span><span>UNA COSA A LA VEZ</span></footer>
    </main>
  </div>
}

export default App
