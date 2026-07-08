'use client'

import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AdminLoginModal({ open, onClose, onSuccess }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        setUsername('')
        setPassword('')
        onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Credenciales incorrectas')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setUsername('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className={`mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="mo-box" style={{ width: 400 }}>
        <div className="mo-top">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--ac)', flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="mo-title">Acceso de administrador</span>
          <button className="mo-close" onClick={handleClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 20 }}>
            Ingresa tus credenciales de administrador para continuar.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="auth-label">Usuario</label>
              <input
                className="imp-inp"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div style={{ position: 'relative' }}>
              <label className="auth-label">Contraseña</label>
              <input
                className="imp-inp"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
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
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading && <span className="auth-spinner" />}
              {loading ? 'Verificando…' : 'Ingresar como admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
