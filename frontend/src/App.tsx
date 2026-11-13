import { useRef, useState } from 'react'
import { Access, useSession, type Account } from './auth'
import { ListTodo, StickyNote } from 'lucide-react'
import WeeklyTasks from './WeeklyTasks'
import { animateTaskChange } from './taskMotion'
import WeeklyRhythm from './WeeklyRhythm'
import GoalsPanel from './GoalsPanel'
import NotesPanel from './NotesPanel'
import { useNotebook } from './api'
import AccountMenu from './AccountMenu'
import { dateKey, startOfWeek } from './tasks'

export default function App() {
  const session = useSession()
  if (session.loading) return <main className="access-main"><p role="status">Comprobando tu sesión…</p></main>
  if (!session.user) return <>{session.error && <div className="access-main"><p role="alert">{session.error}</p><button className="text-button" onClick={() => { void session.check() }}>Reintentar conexión</button></div>}<Access onSubmit={session.login}/></>
  return <Notebook key={session.user.id} user={session.user} onLogout={session.logout} loggingOut={session.loggingOut} sessionError={session.error}/>
}
function Notebook({ user, onLogout, loggingOut, sessionError }: { user: Account; onLogout: () => Promise<void>; loggingOut: boolean; sessionError: string }) {
  const api = useNotebook()
  const tasks = { items: api.data?.tasks ?? [], blocked: api.blocked }
  const goals = { items: api.data?.goals ?? [], blocked: api.blocked }
  const notes = { items: api.data?.notes ?? [], blocked: api.blocked }
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const selectedGoal = goals.items.find(goal => goal.id === selectedGoalId) ?? null
  const goalIntent = useRef<string | null>(null)
  const setGoalFilter = (id: string | null, animate = true) => {
    goalIntent.current = id
    if (animate) animateTaskChange(() => setSelectedGoalId(id))
    else setSelectedGoalId(id)
  }
  const selectGoal = (id: string) => {
    setGoalFilter(goalIntent.current === id ? null : id)
    document.getElementById('tareas')?.focus({ preventScroll: true })
    document.getElementById('tareas')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const [section, setSection] = useState<'tasks' | 'notes'>('tasks')
  const changeSection = (next: 'tasks' | 'notes') => {
    document.querySelectorAll<HTMLElement>('[popover]').forEach(panel => {
      try { panel.hidePopover() } catch { /* Already closed. */ }
    })
    setSection(next)
  }
  const [visibleWeek, setVisibleWeek] = useState(() => dateKey(startOfWeek(new Date())))
  return <div className="notebook-shell">
    <a className="skip-link" href="#contenido">Ir al contenido</a>
    <header className="notebook-header">
      <a className="notebook-brand" href="#contenido"><ListTodo size={24} aria-hidden="true"/>cuaderno<span>.</span></a>
      <AccountMenu user={user} onLogout={onLogout} loggingOut={loggingOut} data={api.data} blocked={api.blocked} onImport={api.importLocal}/>
    </header>
    <main className="notebook-main" id="contenido" tabIndex={-1}>
      <div className="server-status"><p role="status">{api.loading ? 'Cargando el cuaderno…' : api.busy ? 'Guardando en el servidor…' : api.error ? 'No se ha confirmado la actualización del cuaderno.' : 'Cuaderno conectado al servidor'}</p>
        <button type="button" className="text-button" disabled={api.busy || api.loading} onClick={() => { void api.refresh() }}>Actualizar</button></div>
      {api.error && <div className="save-error" role="alert">{api.error}</div>}
      {sessionError && <p role="alert" className="save-error">{sessionError}</p>}
      <fieldset className="section-switch" data-section={section}><legend className="sr-only">Sección de Cuaderno</legend>
        <label><input className="sr-only" type="radio" name="notebook-section" value="tasks" checked={section === 'tasks'} onChange={() => changeSection('tasks')}/><span><ListTodo size={17} aria-hidden="true"/>Tareas</span></label>
        <label><input className="sr-only" type="radio" name="notebook-section" value="notes" checked={section === 'notes'} onChange={() => changeSection('notes')}/><span><StickyNote size={17} aria-hidden="true"/>Notas e ideas</span></label>
      </fieldset>
      {api.data && <div className="section-stage" data-section={section}>
      <div className="section-view tasks-view" inert={section !== 'tasks'} aria-hidden={section !== 'tasks'}>
      <div className="notebook-layout">
        <WeeklyTasks tasks={tasks.items} goals={goals.items} visibleWeek={visibleWeek} onWeekChange={setVisibleWeek}
          onAdd={api.addTask} blocked={tasks.blocked} selectedGoal={selectedGoal} onClearGoal={(animate = true) => setGoalFilter(null, animate)} onSelectGoal={setGoalFilter}
          onEdit={api.editTask} onUnlink={api.unlinkTask}
          onDelete={api.deleteTask}
          onToggle={api.toggleTask}/>
        <aside className="notebook-aside" aria-label="Objetivos y distribución semanal">
          <GoalsPanel goals={goals.items} visibleWeek={visibleWeek} onAdd={api.addGoal} onDelete={api.deleteGoal} blocked={goals.blocked} selectedGoalId={selectedGoal?.id ?? null} onSelectGoal={selectGoal}/>
          <WeeklyRhythm tasks={tasks.items} visibleWeek={visibleWeek}/>
        </aside>
      </div>
      </div>
      <div className="section-view notes-view" inert={section !== 'notes'} aria-hidden={section !== 'notes'}>
        <NotesPanel notes={notes.items} onAdd={api.addNote} blocked={notes.blocked} error=""/>
      </div>
      </div>}
    </main>
  </div>
}
