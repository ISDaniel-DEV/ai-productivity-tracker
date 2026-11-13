import type { Note } from './notes'
import { isDateKey, type Goal, type Task } from './tasks'

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
export const isTask = (value: unknown): value is Task => record(value)
  && typeof value.id === 'number' && Number.isFinite(value.id) && typeof value.title === 'string'
  && typeof value.time === 'string' && typeof value.project === 'string' && typeof value.color === 'string'
  && typeof value.done === 'boolean' && isDateKey(value.dueDate)
  && (value.weeklyGoalId === undefined || typeof value.weeklyGoalId === 'string')
export const isGoal = (value: unknown): value is Goal => record(value) && typeof value.id === 'string'
  && typeof value.title === 'string' && (value.period === 'week' || value.period === 'month')
  && typeof value.periodKey === 'string'
  && (value.period === 'week' ? isDateKey(value.periodKey) : isDateKey(`${value.periodKey}-01`))
  && (value.parentId === undefined || typeof value.parentId === 'string')

export const isNote = (value: unknown): value is Note => record(value)
  && typeof value.id === 'string' && (value.kind === 'idea' || value.kind === 'note')
  && typeof value.title === 'string' && typeof value.body === 'string'
  && ['topic', 'project', 'none'].includes(String(value.categoryType)) && typeof value.category === 'string'
  && (value.categoryType === 'none' || Boolean(value.category.trim()))
  && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
