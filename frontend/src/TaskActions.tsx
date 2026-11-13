import { useEffect, useId, useRef, useState } from 'react'
import { Ellipsis, Trash2, Pencil, Unlink } from 'lucide-react'

type Props = { title: string; disabled: boolean; entity?: 'task' | 'goal'; onDelete: () => void | Promise<boolean>; onEdit?: () => void; onUnlink?: () => Promise<boolean> }

export default function TaskActions({ title, disabled, onDelete, onEdit, onUnlink, entity = 'task' }: Props) {
  const id = useId()
  const anchor = `--task-actions-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded || CSS.supports('position-area: block-end')) return
    const position = () => {
      if (!panel.current || !trigger.current) return
      const button = trigger.current.getBoundingClientRect()
      const menu = panel.current.getBoundingClientRect()
      const left = Math.max(8, Math.min(innerWidth - menu.width - 8, button.right - menu.width))
      const top = button.bottom + menu.height + 4 <= innerHeight ? button.bottom + 4 : Math.max(8, button.top - menu.height - 4)
      panel.current.style.left = `${left}px`
      panel.current.style.top = `${top}px`
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [expanded])

  return <>
    <button ref={trigger} type="button" className="task-options" popoverTarget={id} disabled={disabled}
      aria-label={`${entity === 'goal' ? 'Opciones del objetivo' : 'Opciones de la tarea'}: ${title}`} aria-expanded={expanded} style={{ anchorName: anchor }}>
      <Ellipsis size={20} aria-hidden="true"/>
    </button>
    <div ref={panel} id={id} popover="auto" className="task-actions-panel" style={{ positionAnchor: anchor }}
      onToggle={event => setExpanded((event.nativeEvent as ToggleEvent).newState === 'open')}>
      <div role="group" aria-label={`${entity === 'goal' ? 'Acciones del objetivo' : 'Acciones de la tarea'}: ${title}`}>
        {onEdit && <button type="button" className="item-action" disabled={disabled} onClick={() => { panel.current?.hidePopover(); onEdit() }}><Pencil size={17} aria-hidden="true"/>Editar tarea</button>}
        {onUnlink && <button type="button" className="item-action" disabled={disabled} onClick={() => { panel.current?.hidePopover(); void onUnlink() }}><Unlink size={17} aria-hidden="true"/>Desenlazar del objetivo</button>}
        <button type="button" className="delete-task" disabled={disabled} onClick={() => {
          panel.current?.hidePopover()
          void onDelete()
        }}><Trash2 size={17} aria-hidden="true"/>{entity === 'goal' ? 'Eliminar objetivo' : 'Borrar tarea'}</button>
      </div>
    </div>
  </>
}
