import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { previewGoalDeletion, type GoalDeletionPlan } from './api'
import type { Goal } from './tasks'

type Props = { goal: Goal; blocked: boolean; onDelete: (id: string, token: string, confirmationText: string, onConfirmed?: () => void) => Promise<boolean>; onClose: () => void }
export default function GoalDeletionDialog({ goal, blocked, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [plan, setPlan] = useState<GoalDeletionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [review, setReview] = useState(false)
  const load = async () => {
    setLoading(true); setError(''); setPlan(null); setConfirmationText('')
    try { setPlan(await previewGoalDeletion(goal.id)); setReview(false) }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudieron comprobar los elementos vinculados.') }
    finally { setLoading(false) }
  }
  useEffect(() => { dialog.current?.showModal(); void load() }, [])
  const remove = async () => {
    if (!plan || blocked || working || review || confirmationText !== 'Eliminar') return
    setWorking(true); setError('')
    const saved = await onDelete(goal.id, plan.confirmationToken, confirmationText, onClose)
    if (!saved) { setWorking(false); setConfirmationText(''); setReview(true); setError('No se ha confirmado el borrado. Revisa los elementos actualizados antes de reintentarlo.') }
  }
  return <dialog ref={dialog} className="goal-dialog" aria-labelledby="delete-goal-title" onClose={onClose} onCancel={event => { if (working) event.preventDefault() }}>
    <div className="dialog-heading"><h2 id="delete-goal-title">Eliminar objetivo</h2><button type="button" className="dialog-close" aria-label="Cerrar eliminación de objetivo" disabled={working} onClick={onClose}><X size={20} aria-hidden="true"/></button></div>
    <p className="deletion-goal-name">{plan?.title ?? goal.title}</p>
    {loading && <p role="status">Comprobando elementos vinculados…</p>}
    {plan && <div className="deletion-scope"><p>Se eliminarán este objetivo y todos sus elementos vinculados, de cualquier fecha:</p><ul><li>{plan.goalIds.length - 1} {plan.goalIds.length === 2 ? 'objetivo vinculado' : 'objetivos vinculados'}</li><li>{plan.taskIds.length} {plan.taskIds.length === 1 ? 'tarea vinculada' : 'tareas vinculadas'}</li></ul><p>Esta acción no se puede deshacer. Para conservar una tarea, cancela y desenlázala primero.</p></div>}
    {plan && <div className="entry-form deletion-confirmation">
      <label htmlFor="goal-deletion-word">Escribe «Eliminar» para confirmar</label>
      <input id="goal-deletion-word" type="text" value={confirmationText} onChange={event => setConfirmationText(event.target.value)} disabled={loading || working || review} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-describedby="goal-deletion-hint"/>
      <p id="goal-deletion-hint" className="form-hint">El botón se habilita al escribir la palabra tal como aparece, con E mayúscula.</p>
    </div>}
    {error && <p role="alert" className="dialog-error">{error}</p>}
    {(!plan || review) && !loading && <button type="button" className="text-button" disabled={working} onClick={() => { void load() }}>Revisar elementos</button>}
    <div className="form-actions"><button autoFocus type="button" className="text-button" disabled={working} onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={!plan || loading || working || blocked || review || confirmationText !== 'Eliminar'} onClick={() => { void remove() }}>{working ? 'Eliminando…' : 'Eliminar objetivo y vínculos'}</button></div>
  </dialog>
}
