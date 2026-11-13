import { useEffect, useRef } from 'react'
import { FileJson, LogOut, X } from 'lucide-react'
import type { Account } from './auth'
import type { Notebook, ImportPayload } from './api'
import LocalImport from './LocalImport'

type Props = { user: Account; loggingOut: boolean; onLogout: () => Promise<void>; data: Notebook | null; blocked: boolean; onImport: (payload: ImportPayload) => Promise<boolean> }
export default function AccountMenu({ user, loggingOut, onLogout, data, blocked, onImport }: Props) {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('es')
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current) menu.current.open = false }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  return <>
    <details className="account-menu" ref={menu}>
      <summary ref={trigger} className="account-avatar" aria-label={`Cuenta de ${user.name}`}><span aria-hidden="true">{initials || 'U'}</span></summary>
      <div className="account-dropdown" role="group" aria-label="Opciones de tu cuenta">
        <p className="account-menu-name">{user.name}</p>
        <button type="button" disabled={loggingOut} onClick={() => { if (menu.current) menu.current.open = false; dialog.current?.showModal() }}><FileJson size={18} aria-hidden="true"/>Sincronizar con JSON</button>
        <button type="button" disabled={loggingOut} onClick={() => { if (menu.current) menu.current.open = false; void onLogout() }}><LogOut size={18} aria-hidden="true"/>{loggingOut ? 'Cerrando…' : 'Cerrar sesión'}</button>
      </div>
    </details>
    <dialog ref={dialog} className="goal-dialog json-dialog" aria-labelledby="json-dialog-title" onClose={() => trigger.current?.focus()}>
      <div className="dialog-heading"><h2 id="json-dialog-title">Sincronizar con JSON</h2><button type="button" className="dialog-close" aria-label="Cerrar sincronización JSON" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true"/></button></div>
      <p className="panel-description">Cuenta: {user.name}</p>
      <LocalImport disabled={blocked} onImport={onImport} data={data}/>
    </dialog>
  </>
}
