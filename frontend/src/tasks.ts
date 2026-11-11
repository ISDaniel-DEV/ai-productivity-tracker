export type Task = {
  id: number
  title: string
  time: string
  project: string
  color: string
  done: boolean
  dueDate: string
}

// Local calendar dates keep tasks on the same day across time zones and DST.
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7))
