import { flushSync } from 'react-dom'

let active: ViewTransition | null = null
let generation = 0
let fallback: Animation | null = null

function transitionChange(update: () => void, confirmed: boolean, weekNavigation = false): Promise<void> {
  const ticket = ++generation
  active?.skipTransition()
  fallback?.cancel()
  document.documentElement.classList.remove('week-navigation-transition')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let applied = false
  const apply = () => {
    if (applied || (!confirmed && ticket !== generation)) return
    applied = true
    flushSync(update)
  }
  if (!document.startViewTransition || reduced) {
    apply()
    if (!reduced) {
      const list = document.querySelector<HTMLElement>('.daily-task-list')
      fallback = list?.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }) ?? null
    }
    return Promise.resolve()
  }
  try {
    document.documentElement.classList.toggle('week-navigation-transition', weekNavigation)
    const transition = document.startViewTransition(apply)
    active = transition
    void transition.ready.catch(() => { /* La captura no condiciona la actualización. */ })
    void transition.finished.catch(() => {}).finally(() => { if (active === transition) { active = null; document.documentElement.classList.remove('week-navigation-transition') } })
    return transition.updateCallbackDone.catch(error => {
      if (confirmed && !applied) apply()
      else if (applied) throw error
    })
  } catch {
    document.documentElement.classList.remove('week-navigation-transition')
    apply()
    return Promise.resolve()
  }
}

/** Los filtros obsoletos se descartan cuando llega una nueva selección. */
export function animateTaskChange(update: () => void) { void transitionChange(update, false) }

/** La fila de días queda fuera de las capturas para aceptar el siguiente gesto. */
export function animateWeekChange(update: () => void) { return transitionChange(update, true, true) }

/** Una escritura ya confirmada nunca se descarta al interrumpir su animación. */
export function animateConfirmedTaskChange(update: () => void) { return transitionChange(update, true) }

export async function animateConfirmedRemoval(goalIds: string[], taskIds: number[], update: () => void, close?: () => void) {
  // Retirar la confirmación permite ver la salida de los elementos que realmente se borraron.
  if (close) flushSync(close)
  const animations: Animation[] = []
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const goals = new Set(goalIds), tasks = new Set(taskIds.map(String))
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-goal-id], [data-task-id]')).filter(element => {
      const affected = (element.dataset.goalId && goals.has(element.dataset.goalId)) || (element.dataset.taskId && tasks.has(element.dataset.taskId))
      if (!affected) return false
      const bounds = element.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth
    })
    for (const element of elements) {
      animations.push(element.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-10px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' }))
    }
  }
  await Promise.allSettled(animations.map(animation => animation.finished))
  try { await animateConfirmedTaskChange(update) }
  finally { animations.forEach(animation => animation.cancel()) }
}
