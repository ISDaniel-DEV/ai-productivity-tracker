import { useId, useRef, useState, type FormEvent } from 'react'
import { Folder, Hash, Lightbulb, Plus, StickyNote, X } from 'lucide-react'
import { categoryKey, cleanCategory, groupNotes, type Note, type NoteDraft } from './notes'

type Props = { notes: Note[]; onAdd: (draft: NoteDraft) => Promise<boolean>; blocked: boolean; error: string }

export default function NotesPanel({ notes, onAdd, blocked, error }: Props) {
  const [filter, setFilter] = useState('all')
  const [kind, setKind] = useState<Note['kind']>('idea')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryType, setCategoryType] = useState<Note['categoryType']>('topic')
  const [category, setCategory] = useState('')
  const [saveError, setSaveError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const categoryInput = useRef<HTMLInputElement>(null)
  const suggestionsId = useId()
  const groups = groupNotes(notes)
  const visibleGroups = groups.filter(group => filter === 'all' || group.key === filter)
  const selected = groups.find(group => group.key === filter)
  const open = () => {
    setSaveError('')
    if (selected && !title && !body) { setCategoryType(selected.type); setCategory(selected.type === 'none' ? '' : selected.title) }
    dialog.current?.showModal()
    titleInput.current?.focus()
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { titleInput.current?.focus(); return }
    if (categoryType !== 'none' && !cleanCategory(category)) { categoryInput.current?.focus(); return }
    const cleaned = cleanCategory(category)
    const existing = groups.find(group => group.key === categoryKey({ categoryType, category: cleaned }))
    const draft: NoteDraft = { kind, title: title.trim(), body: body.trim(), categoryType,
      category: categoryType === 'none' ? '' : existing?.title ?? cleaned }
    if (submitting || blocked) return
    setSubmitting(true); setSaveError('')
    const saved = await onAdd(draft)
    setSubmitting(false)
    if (saved) {
      setFilter(categoryKey(draft))
      setStatus(`${kind === 'idea' ? 'Idea' : 'Nota'} guardada: ${title.trim()}`)
      setTitle(''); setBody(''); setSaveError(''); dialog.current?.close()
    } else setSaveError('No se pudo guardar. El texto sigue aquí; comprueba la conexión con el servidor e inténtalo de nuevo.')
  }
  return <div className="notes-panel">
    <div className="task-panel-heading notes-heading"><div><h1 id="notas" tabIndex={-1}>Notas e ideas</h1><p className="panel-description">Un lugar para lo que no quieres olvidar.</p></div>
      <button type="button" className="primary-button" onClick={open} disabled={blocked}><Plus size={17} aria-hidden="true"/>Añadir nota o idea</button>
    </div>
    {error && <div className="save-error" role="alert">{error}</div>}
    <div className="notes-layout">
      <nav className="note-filters" aria-label="Filtrar notas por temática o proyecto">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todas<span>{notes.length}</span></button>
        {(['topic', 'project', 'none'] as const).map(type => {
          const items = groups.filter(group => group.type === type)
          if (!items.length) return null
          return <div className={`note-filter-group ${type === 'none' ? 'uncategorized-filter' : ''}`} key={type}>
            {type !== 'none' && <h2>{type === 'topic' ? 'Temáticas' : 'Proyectos'}</h2>}
            {items.map(group => <button key={group.key} type="button" aria-pressed={filter === group.key} onClick={() => setFilter(group.key)}>
              {type === 'project' ? <Folder size={16} aria-hidden="true"/> : type === 'topic' ? <Hash size={16} aria-hidden="true"/> : <StickyNote size={16} aria-hidden="true"/>}<span className="filter-name">{group.title}</span><span>{group.notes.length}</span>
            </button>)}
          </div>
        })}
        {!groups.length && <p className="panel-note">Tus temáticas y proyectos aparecerán al apuntar la primera entrada.</p>}
      </nav>
      <div className="note-groups">{visibleGroups.length ? visibleGroups.map(group => <section className="note-group" key={group.key} aria-labelledby={`group-${encodeURIComponent(group.key)}`}>
        <div className="note-group-heading"><h2 id={`group-${encodeURIComponent(group.key)}`}>{group.title}</h2>{group.type !== 'none' && <span className="note-category-type">{group.type === 'project' ? 'Proyecto' : 'Temática'}</span>}</div>
        <ul>{group.notes.map(note => <li key={note.id}>
          <article className="note-entry">
            <div className="note-entry-meta"><span className="note-kind">{note.kind === 'idea' ? <Lightbulb size={15} aria-hidden="true"/> : <StickyNote size={15} aria-hidden="true"/>}{note.kind === 'idea' ? 'Idea' : 'Nota'}</span>
              <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <h3>{note.title}</h3>{note.body && <p>{note.body}</p>}
          </article>
        </li>)}</ul>
      </section>) : <div className="notes-empty"><StickyNote size={30} aria-hidden="true"/><h2>Deja aquí tu próxima idea</h2><p>Apunta una nota o una idea y agrúpala por temática o proyecto. No hace falta asignarle una fecha.</p></div>}</div>
    </div>
    <dialog ref={dialog} className="goal-dialog note-dialog" aria-labelledby="note-dialog-title">
      <div className="dialog-heading"><h2 id="note-dialog-title">Apuntar una nota o idea</h2><button type="button" className="dialog-close" aria-label="Cerrar formulario de nota" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true"/></button></div>
      <form className="entry-form" aria-busy={submitting} aria-labelledby="note-dialog-title" onSubmit={submit}>
        <fieldset><legend>Qué quieres apuntar</legend><div className="note-kind-options">
          <label><input disabled={submitting} type="radio" name="note-kind" value="idea" checked={kind === 'idea'} onChange={() => setKind('idea')}/>Idea</label>
          <label><input disabled={submitting} type="radio" name="note-kind" value="note" checked={kind === 'note'} onChange={() => setKind('note')}/>Nota</label>
        </div></fieldset>
        <label htmlFor="note-title">Título (obligatorio)</label><input disabled={submitting} ref={titleInput} id="note-title" name="note-title" required pattern=".*\S.*" maxLength={180} value={title} onChange={event => setTitle(event.target.value)} placeholder="¿Qué quieres recordar?"/>
        <label htmlFor="note-body">Detalles (opcional)</label><textarea disabled={submitting} id="note-body" name="note-body" rows={4} maxLength={6000} value={body} onChange={event => setBody(event.target.value)}/>
        <label htmlFor="note-category-type">Organizar por</label><select disabled={submitting} id="note-category-type" name="note-category-type" value={categoryType} onChange={event => { setCategoryType(event.target.value as Note['categoryType']); setCategory('') }}>
          <option value="topic">Temática</option><option value="project">Proyecto</option><option value="none">Sin clasificar</option>
        </select>
        {categoryType !== 'none' && <><label htmlFor="note-category">{categoryType === 'project' ? 'Proyecto' : 'Temática'} (obligatorio)</label>
          <input disabled={submitting} ref={categoryInput} id="note-category" name="note-category" list={suggestionsId} required pattern=".*\S.*" maxLength={80} value={category} onChange={event => setCategory(event.target.value)} placeholder={categoryType === 'project' ? 'Ej.: Cuaderno' : 'Ej.: Aprendizaje'}/>
          <datalist id={suggestionsId}>{groups.filter(group => group.type === categoryType).map(group => <option key={group.key} value={group.title}/>)}</datalist>
          <p className="form-hint">Elige un nombre existente o escribe uno nuevo.</p></>}
        {saveError && <p className="dialog-error" role="alert">{saveError}</p>}
        <div className="form-actions"><button type="button" className="text-button" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="primary-button" disabled={submitting || blocked}>{submitting ? 'Guardando…' : 'Guardar entrada'}</button></div>
      </form>
    </dialog>
    <p className="sr-only" role="status">{status}</p>
  </div>
}
