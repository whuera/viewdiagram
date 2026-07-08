'use client'

import { useState, useCallback, useRef } from 'react'
import { CATS, type Diagram } from '@/lib/types'
import type { Role } from '@/lib/auth'
import Sidebar from './Sidebar'
import Canvas from './Canvas'
import ViewerModal from './ViewerModal'
import ImportModal from './ImportModal'
import AdminLoginModal from './AdminLoginModal'

interface Props {
  initialDiagrams: Diagram[]
  role: Role
  username: string
}

export default function Dashboard({ initialDiagrams, role, username }: Props) {
  const [diagrams, setDiagrams] = useState<Diagram[]>(initialDiagrams)
  const [curCat, setCurCat] = useState('all')
  const [curView, setCurView] = useState<'grid' | 'list'>('grid')
  const [q, setQ] = useState('')
  const [isMini, setIsMini] = useState(false)
  const [viewing, setViewing] = useState<Diagram | null>(null)
  const [editing, setEditing] = useState<Diagram | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [effectiveRole, setEffectiveRole] = useState<Role>(role)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)

  const filtered = diagrams.filter(d => {
    const mc = curCat === 'all' || d.cat === curCat
    const mq = !q || d.name.toLowerCase().includes(q.toLowerCase()) || (d.description || '').toLowerCase().includes(q.toLowerCase())
    return mc && mq
  })

  function requireAdmin(action: () => void) {
    if (effectiveRole === 'admin') {
      action()
    } else {
      pendingAction.current = action
      setShowAdminLogin(true)
    }
  }

  function handleAdminLoginSuccess() {
    setEffectiveRole('admin')
    setShowAdminLogin(false)
    const action = pendingAction.current
    pendingAction.current = null
    if (action) action()
  }

  function handleToggleSection(cat: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function openImport(d?: Diagram) {
    setEditing(d || null)
    setImportOpen(true)
  }

  function handleSaved(saved: Diagram) {
    setDiagrams(prev => {
      const idx = prev.findIndex(d => d.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  const handleDelete = useCallback(async (d: Diagram) => {
    if (!confirm(`¿Eliminar "${d.name}"?`)) return
    const res = await fetch(`/api/diagrams/${d.id}`, { method: 'DELETE' })
    if (res.ok) setDiagrams(prev => prev.filter(x => x.id !== d.id))
  }, [])

  function handleDownload(d: Diagram) {
    const safe = d.name.replace(/[^a-z0-9]/gi, '_')
    if (d.svgCache) {
      const blob = new Blob([d.svgCache], { type: 'image/svg+xml' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = safe + '.svg'; a.click(); URL.revokeObjectURL(a.href)
    } else if (d.imageData) {
      const ext = (d.imageData.match(/^data:image\/([^;]+)/) || [])[1] || 'png'
      const a = document.createElement('a'); a.href = d.imageData; a.download = safe + '.' + (ext === 'jpeg' ? 'jpg' : ext); a.click()
    }
  }

  function handleCanvasDrop(f: File) {
    requireAdmin(() => {
      openImport()
      setTimeout(() => {
        const event = new CustomEvent('canvas-drop-file', { detail: f })
        window.dispatchEvent(event)
      }, 100)
    })
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setEffectiveRole('viewer')
  }

  return (
    <>
      <Sidebar
        isMini={isMini}
        onToggle={() => setIsMini(v => !v)}
        curCat={curCat}
        onSelectCat={setCurCat}
        q={q}
        onSearch={setQ}
        diagrams={diagrams}
        onOpenModal={setViewing}
        onImport={() => requireAdmin(() => openImport())}
        openSections={openSections}
        onToggleSection={handleToggleSection}
        role={effectiveRole}
      />

      <main className={`main${isMini ? ' mini' : ''}`}>
        {/* Topbar */}
        <div className="topbar">
          <div className="tb-bc">
            <span className="crumb" onClick={() => setCurCat('all')}>Diagramas</span>
            {curCat !== 'all' && (
              <>
                <span className="sep">›</span>
                <span className="cur">{CATS[curCat]?.label || curCat}</span>
              </>
            )}
          </div>
          <div className="tb-acts">
            <div className="view-tgl">
              <button className={`vb${curView === 'grid' ? ' active' : ''}`} title="Cuadrícula" onClick={() => setCurView('grid')}>
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
              <button className={`vb${curView === 'list' ? ' active' : ''}`} title="Lista" onClick={() => setCurView('list')}>
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
            <div className="tb-div" />
            <button className="tb-btn primary" onClick={() => requireAdmin(() => openImport())}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Importar</span>
            </button>
            <div className="tb-div" />
            {effectiveRole === 'admin' ? (
              <>
                <div className="auth-user-badge">
                  <span className="auth-username">{username}</span>
                  <span className="tag tag-tx" style={{ fontSize: 10, padding: '2px 6px' }}>Admin</span>
                </div>
                <button className="tb-btn" title="Cerrar sesión" onClick={handleLogout}>
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </>
            ) : (
              <button className="tb-btn" title="Iniciar sesión como admin" onClick={() => setShowAdminLogin(true)}>
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <Canvas
          diagrams={filtered}
          curCat={curCat}
          curView={curView}
          onOpenModal={setViewing}
          onOpenImport={d => requireAdmin(() => openImport(d))}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onDrop={handleCanvasDrop}
          onImportNew={() => requireAdmin(() => openImport())}
          role={effectiveRole}
        />
      </main>

      <ViewerModal
        diagram={viewing}
        onClose={() => setViewing(null)}
        onEditXml={d => requireAdmin(() => openImport(d))}
        role={effectiveRole}
      />

      <ImportModal
        open={importOpen}
        editing={editing}
        defaultCat={curCat !== 'all' ? curCat : 'cl'}
        onClose={() => { setImportOpen(false); setEditing(null) }}
        onSaved={handleSaved}
      />

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => { setShowAdminLogin(false); pendingAction.current = null }}
        onSuccess={handleAdminLoginSuccess}
      />
    </>
  )
}
