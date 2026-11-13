import { useEffect, useState, type FormEvent } from 'react'
import { ListTodo } from 'lucide-react'
export type Account = { id: number; name: string; email: string }
let accountId: number | null = null
export const accountHeader = (): Record<string, string> => accountId === null ? {} : { 'X-Cuaderno-Account': String(accountId) }
export const expiredSession = () => window.dispatchEvent(new Event('cuaderno-session-changed'))
async function authFetch(path: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20000)
  try { return await fetch(path, { ...options, signal: controller.signal }) }
  catch { throw new Error('No se pudo conectar con el servidor. Revisa la conexión y vuelve a intentarlo.') }
  finally { window.clearTimeout(timer) }
}
export async function csrfHeaders() {
  const response = await authFetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('No se pudo verificar la sesión. Actualiza la página y vuelve a intentarlo.')
  const csrf = await response.json()
  return { [csrf.headerName]: csrf.token as string }
}
async function authRequest(path: string, body?: unknown) {
  const response = await authFetch(`/api/auth/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Cuaderno-Request': '1', ...await csrfHeaders() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  if (!response.ok) { const problem = await response.json().catch(() => null); throw new Error(problem?.detail || 'No se pudo completar la operación. Vuelve a intentarlo.') }
  return response.status === 204 ? null : response.json()
}
export function useSession() {
  const [user, setUser] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const accept = (next: Account | null) => { accountId = next?.id ?? null; setUser(next) }
  const check = async () => {
    setLoading(true); setError('')
    try { const session = await authRequest('session'); accept(session.user) }
    catch { accept(null); setError('No se pudo comprobar tu sesión. Revisa la conexión y vuelve a intentarlo.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    void check()
    const changed = () => { accept(null); void check() }
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('cuaderno-session')
    if (channel) channel.onmessage = changed
    window.addEventListener('cuaderno-session-changed', changed)
    return () => { channel?.close(); window.removeEventListener('cuaderno-session-changed', changed) }
  }, [])
  const announce = () => { if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('cuaderno-session'); channel.postMessage('changed'); channel.close() } }
  const login = async (mode: 'login' | 'register', input: { name?: string; email: string; password: string }) => {
    const session = await authRequest(mode, input); accept(session.user); announce()
  }
  const logout = async () => {
    setLoggingOut(true); setError('')
    try { await authRequest('logout', {}); accept(null); announce() }
    catch { setError('No se pudo cerrar la sesión. Comprueba la conexión y vuelve a intentarlo.') }
    finally { setLoggingOut(false) }
  }
  return { user, loading, error, login, logout, loggingOut, check }
}
export function Access({ onSubmit }: { onSubmit: (mode: 'login' | 'register', input: { name?: string; email: string; password: string }) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [showPassword, setShowPassword] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('')
    try { await onSubmit(mode, { ...(mode === 'register' ? { name: name.trim() } : {}), email: email.trim(), password }); setPassword('') }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo conectar. Conservamos los campos para que puedas reintentarlo.') }
    finally { setBusy(false) }
  }
  return <div className="notebook-shell"><header className="notebook-header"><a className="notebook-brand" href="/"><ListTodo size={24} aria-hidden="true"/>cuaderno<span>.</span></a></header>
    <main className="access-main"><h1>{mode === 'login' ? 'Vuelve a tu cuaderno' : 'Crea tu cuaderno'}</h1>
      <p className="panel-description">Tus tareas, objetivos e ideas, en tu cuenta.</p>
      <form className="entry-form access-form" onSubmit={submit} aria-busy={busy}>
        {mode === 'register' && <><label htmlFor="access-name">Nombre</label><input id="access-name" autoComplete="name" required maxLength={100} pattern=".*\S.*" disabled={busy} value={name} onChange={e => setName(e.target.value)}/></>}
        <label htmlFor="access-email">Correo electrónico</label><input id="access-email" type="email" autoComplete="username" required maxLength={254} disabled={busy} value={email} onChange={e => setEmail(e.target.value)}/>
        <label htmlFor="access-password">Contraseña</label><input id="access-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128} aria-describedby={mode === 'register' ? 'password-hint' : undefined} disabled={busy} value={password} onChange={e => setPassword(e.target.value)}/>
        <label className="password-toggle"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)}/>Mostrar contraseña</label>
        {mode === 'register' && <p id="password-hint" className="form-hint">Usa entre 12 y 128 caracteres. Puedes pegar una contraseña de tu gestor.</p>}
        {error && <p className="dialog-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
      </form>
      <p className="access-alternative">{mode === 'login' ? '¿Primera vez aquí?' : '¿Ya tienes cuenta?'} <button type="button" className="text-button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setPassword('') }}>{mode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}</button></p>
      {mode === 'register' && <p className="form-hint">Por ahora no hay recuperación de contraseña por correo. Guárdala en un lugar seguro.</p>}
    </main></div>
}
