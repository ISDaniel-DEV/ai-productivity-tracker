export type Note = {
  id: string
  kind: 'idea' | 'note'
  title: string
  body: string
  categoryType: 'topic' | 'project' | 'none'
  category: string
  createdAt: string
}
export type NoteDraft = Omit<Note, 'id' | 'createdAt'>
export const cleanCategory = (value: string) => value.trim().replace(/\s+/g, ' ')
export const categoryKey = (note: Pick<Note, 'categoryType' | 'category'>) =>
  note.categoryType === 'none' ? 'none' : `${note.categoryType}:${cleanCategory(note.category).toLocaleLowerCase('es')}`
export const groupNotes = (notes: Note[]) => {
  const groups = new Map<string, { key: string; title: string; type: Note['categoryType']; notes: Note[] }>()
  for (const note of notes) {
    const key = categoryKey(note)
    if (!groups.has(key)) groups.set(key, { key, title: note.categoryType === 'none' ? 'Sin clasificar' : note.category, type: note.categoryType, notes: [] })
    groups.get(key)!.notes.push(note)
  }
  return [...groups.values()].sort((a, b) => {
    if (a.type === 'none' && b.type !== 'none') return 1
    if (b.type === 'none' && a.type !== 'none') return -1
    return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }) || a.type.localeCompare(b.type)
  }).map(group => ({ ...group, notes: group.notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }))
}
