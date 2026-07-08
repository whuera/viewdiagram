'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Credenciales inválidas')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.MouseEvent) {
    e.preventDefault()
    if (forgotSent) return
    await fetch('/api/auth/forgot-password', { method: 'POST' })
    setForgotSent(true)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <label className="auth-label" htmlFor="username">Usuario</label>
        <input
          id="username"
          className="imp-inp"
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="admin / invitado"
          required
        />
      </div>
      <div style={{ position: 'relative' }}>
        <label className="auth-label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          className="imp-inp"
          type={showPw ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ paddingRight: 40 }}
          required
        />
        <button
          type="button"
          className="auth-eye"
          tabIndex={-1}
          onClick={() => setShowPw(v => !v)}
          title={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPw ? (
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? <span className="auth-spinner"/> : null}
        {loading ? 'Entrando…' : 'Entrar'}
      </button>

      <button type="button" className="auth-forgot" onClick={handleForgot}>
        {forgotSent ? 'Contraseña enviada a whuera@gmail.com' : 'Olvidé mi contraseña'}
      </button>
    </form>
  )
}
