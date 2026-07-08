import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (token) {
    const payload = await verifyToken(token)
    if (payload) redirect('/')
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M14 17.5h7M17.5 14v7"/>
            </svg>
          </div>
          <span className="logo-tx" style={{ fontSize: 17 }}>ViewDiagram</span>
        </div>
        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-sub">Ingresa tus credenciales para acceder</p>
        <LoginForm />
      </div>
    </div>
  )
}
