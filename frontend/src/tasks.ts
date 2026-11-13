export type Task = {
  id: number
  title: string
  time: string
  project: string
  color: string
  done: boolean
  dueDate: string
  weeklyGoalId?: string
}

// Local calendar dates keep tasks on the same day across time zones and DST.
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7))

export type Goal = {
  id: string
  title: string
  period: 'week' | 'month'
  periodKey: string
  parentId?: string
}
export type TaskDraft = { title: string; dueDate: string; time: string; weeklyGoalId?: string }
export const parseDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
export const weekKey = (key: string) => dateKey(startOfWeek(parseDate(key)))
export const isDateKey = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value)) === value
export const monthKeysForWeek = (key: string) => [...new Set([key.slice(0, 7), dateKey(addDays(parseDate(key), 6)).slice(0, 7)])]
export const monthLabel = (key: string) => parseDate(`${key}-01`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
