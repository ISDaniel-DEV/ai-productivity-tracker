import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { animateWeekChange } from './taskMotion'
import { addDays, dateKey, parseDate, startOfWeek, type Task } from './tasks'

type Props = { visibleWeek: string; tasks: Task[]; selectedDate: string | null; onWeekChange: (week: string) => void; onDateChange: (date: string | null) => void }
type Destination = { week: string; direction: number }
const names = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const adjacent = (week: string, direction: number) => dateKey(addDays(parseDate(week), direction * 7))
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function WeekNavigator({ visibleWeek, tasks, selectedDate, onWeekChange, onDateChange }: Props) {
  const strip = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<Destination | null>(null)
  const current = useRef({ week: visibleWeek, onWeekChange })
  current.current = { week: visibleWeek, onWeekChange }
  const flight = useRef<Destination | null>(null)
  const target = useRef<string | null>(null)
  const expected = useRef<string | null>(null)
  const resetting = useRef(true)
  const settling = useRef(false)
  const touching = useRef(false)
  const timer = useRef(0)
  const frame = useRef(0)
  const suppressClick = useRef(false)
  const clickTimer = useRef(0)
  const drag = useRef<{ id: number; x: number; y: number; left: number; moving: boolean } | null>(null)

  function start(week: string) {
    if (week === current.current.week) { target.current = null; return }
    const destination = { week, direction: week > current.current.week ? 1 : -1 }
    flight.current = destination
    setPreview(destination)
  }
  function go(week: string) {
    target.current = week
    if (!flight.current && !resetting.current && !settling.current) start(week)
  }
  function step(direction: number) { go(adjacent(target.current ?? flight.current?.week ?? current.current.week, direction)) }
  function settle() {
    window.clearTimeout(timer.current)
    const element = strip.current
    if (!element || resetting.current || settling.current || touching.current || drag.current?.moving || !element.clientWidth) return
    const index = Math.round(element.scrollLeft / element.clientWidth)
    if (Math.abs(element.scrollLeft - index * element.clientWidth) > 2) return
    if (index === 1) {
      // El recentrado puede emitir scrollend justo al arrancar la siguiente navegación.
      if (flight.current) return
      target.current = null; setPreview(null); return
    }
    const direction = index < 1 ? -1 : 1
    const destination = flight.current?.direction === direction ? flight.current.week : adjacent(current.current.week, direction)
    if (!flight.current || flight.current.direction !== direction) target.current = destination
    settling.current = true
    expected.current = destination
    // La semana que llegó al centro debe aplicarse aunque otra transición la interrumpa.
    void animateWeekChange(() => current.current.onWeekChange(destination))
  }
  function scheduleSettle() { window.clearTimeout(timer.current); timer.current = window.setTimeout(settle, 160) }

  useLayoutEffect(() => {
    const element = strip.current
    if (!element) return
    if (expected.current !== visibleWeek) target.current = null
    flight.current = null
    setPreview(null)
    resetting.current = true
    settling.current = false
    drag.current = null
    element.style.scrollSnapType = ''
    element.removeAttribute('data-dragging')
    element.scrollTo({ left: element.clientWidth, behavior: 'instant' })
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      resetting.current = false
      expected.current = null
      if (target.current && target.current !== current.current.week) start(target.current)
      else target.current = null
    })
  }, [visibleWeek])

  useLayoutEffect(() => {
    if (!preview || !strip.current) return
    const element = strip.current
    element.scrollTo({ left: element.clientWidth * (preview.direction + 1), behavior: reducedMotion() ? 'instant' : 'smooth' })
    scheduleSettle()
  }, [preview])

  useEffect(() => {
    const element = strip.current
    if (!element) return
    const scroll = () => { if (!resetting.current) scheduleSettle() }
    element.addEventListener('scroll', scroll, { passive: true })
    element.addEventListener('scrollend', settle)
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (Math.abs(element.clientWidth - width) < 1) return
      width = element.clientWidth
      flight.current = null; target.current = null; settling.current = false
      setPreview(null)
      resetting.current = true
      element.scrollTo({ left: width, behavior: 'instant' })
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => { resetting.current = false })
    })
    observer.observe(element)
    return () => {
      observer.disconnect(); element.removeEventListener('scroll', scroll); element.removeEventListener('scrollend', settle)
      window.clearTimeout(timer.current); window.clearTimeout(clickTimer.current); cancelAnimationFrame(frame.current)
    }
  }, [])

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    if (!gesture || event.pointerId !== gesture.id) return
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
    if (!gesture.moving) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      gesture.moving = true
      flight.current = null; target.current = null; setPreview(null)
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.style.scrollSnapType = 'none'
      event.currentTarget.dataset.dragging = 'true'
    }
    event.preventDefault()
    event.currentTarget.scrollLeft = gesture.left - dx
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const gesture = drag.current
    drag.current = null
    if (!gesture?.moving) return
    const element = event.currentTarget
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    element.style.scrollSnapType = ''
    element.removeAttribute('data-dragging')
    suppressClick.current = true
    window.clearTimeout(clickTimer.current)
    clickTimer.current = window.setTimeout(() => { suppressClick.current = false }, 0)
    const dx = event.clientX - gesture.x
    if (!cancelled && Math.abs(dx) > Math.min(60, element.clientWidth * .18)) step(dx < 0 ? 1 : -1)
    else { element.scrollTo({ left: element.clientWidth, behavior: reducedMotion() ? 'instant' : 'smooth' }); scheduleSettle() }
  }

  const first = parseDate(visibleWeek), last = addDays(first, 6), today = dateKey(new Date())
  const range = `${first.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${last.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const counts = new Map<string, number>()
  tasks.forEach(task => counts.set(task.dueDate, (counts.get(task.dueDate) ?? 0) + 1))
  return <>
    <div className="week-toolbar"><p role="status">{range}</p><div className="week-navigation">
      <button type="button" aria-label="Semana anterior" onClick={() => step(-1)}><ArrowLeft size={18}/></button>
      <button type="button" onClick={() => go(dateKey(startOfWeek(new Date())))}>Esta semana</button>
      <button type="button" aria-label="Semana siguiente" onClick={() => step(1)}><ArrowRight size={18}/></button>
    </div></div>
    <p className="sr-only" id="week-swipe-hint">Desliza los días a la izquierda para la semana siguiente o a la derecha para la anterior. También puedes usar los botones de semana.</p>
    <div ref={strip} className="week-strip" role="region" aria-label="Navegación entre semanas" aria-describedby="week-swipe-hint"
      onTouchStart={() => { touching.current = true; if (!settling.current) { flight.current = null; target.current = null; setPreview(null) } }} onTouchEnd={event => { touching.current = event.touches.length > 0; scheduleSettle() }} onTouchCancel={() => { touching.current = false; scheduleSettle() }}
      onPointerDown={event => { if (event.pointerType === 'mouse' && event.button === 0) drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, moving: false } }}
      onPointerMove={pointerMove} onPointerUp={event => pointerUp(event)} onPointerCancel={event => pointerUp(event, true)}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false } }}>
      {[-1, 0, 1].map(offset => {
        const week = preview?.direction === offset ? preview.week : adjacent(visibleWeek, offset)
        return <div className="week-slide" key={offset} inert={offset !== 0} aria-hidden={offset !== 0}>
          <div className="day-picker" role="group" aria-label="Filtrar tareas por día">{Array.from({ length: 7 }, (_, index) => {
            const day = addDays(parseDate(week), index), key = dateKey(day), count = counts.get(key) ?? 0
            return <button type="button" key={key} aria-pressed={selectedDate === key} aria-current={key === today ? 'date' : undefined} className={`${key === today ? 'is-today' : ''} ${selectedDate === key ? 'is-selected' : ''}`} onClick={() => onDateChange(selectedDate === key ? null : key)}>
              <span>{names[index]}</span><strong>{day.getDate()}</strong><small>{count}<span className="day-count-word"> {count === 1 ? 'tarea' : 'tareas'}</span></small>
            </button>
          })}</div>
        </div>
      })}
    </div>
  </>
}
