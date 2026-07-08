'use client'

import { type Diagram } from '@/lib/types'
import type { Role } from '@/lib/auth'

interface Props {
  isMini: boolean
  onToggle: () => void
  curCat: string
  onSelectCat: (cat: string) => void
  q: string
  onSearch: (q: string) => void
  diagrams: Diagram[]
  onOpenModal: (d: Diagram) => void
  onImport: () => void
  openSections: Set<string>
  onToggleSection: (cat: string) => void
  role: Role
}

const S = { stroke: 'currentColor', fill: 'none' } as const

const CAT_LABELS: Record<string, string> = {
  tx: 'Arq. Transaccional',
  cl: 'Soluciones Cloud',
  op: 'Soluciones On-Premise',
  hb: 'Soluciones Híbridas',
}

function IcoAll() {
  return <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IcoTx() {
  return <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function IcoCl() {
  return <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
}
function IcoOp() {
  return <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
}
function IcoHb() {
  return <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}

const CAT_ICO: Record<string, () => JSX.Element> = { all: IcoAll, tx: IcoTx, cl: IcoCl, op: IcoOp, hb: IcoHb }

export default function Sidebar({ isMini, onToggle, curCat, onSelectCat, q, onSearch, diagrams, onOpenModal, onImport, openSections, onToggleSection, role }: Props) {
  const count = (cat: string) => cat === 'all' ? diagrams.length : diagrams.filter(d => d.cat === cat).length
  const Icon = ({ cat }: { cat: string }) => { const C = CAT_ICO[cat]; return C ? <C /> : null }

  return (
    <aside className={`sidebar${isMini ? ' mini' : ''}`}>
      <div className="sb-logo">
        <div className="logo-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 17.5h7M17.5 14v7"/>
          </svg>
        </div>
        <span className="logo-tx">ViewDiagram</span>
      </div>

      <button className="toggle-btn" onClick={onToggle}>
        <svg viewBox="0 0 24 24" {...S} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <div className="sb-search">
        <div className="sw">
          <svg viewBox="0 0 24 24" {...S} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar diagrama…"
            value={q}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>

      <nav className="sb-nav">
        {/* All */}
        <div className="nav-sec open">
          <div className={`nav-hd${curCat === 'all' ? ' active' : ''}`} onClick={() => onSelectCat('all')}>
            <div className="nav-ic"><Icon cat="all" /></div>
            <span className="nav-lb">Todos los diagramas</span>
            <span className="nav-cnt">{count('all')}</span>
          </div>
        </div>

        {/* Category sections */}
        {(['tx', 'cl', 'op', 'hb'] as const).map(cat => (
          <div key={cat} className={`nav-sec${openSections.has(cat) ? ' open' : ''}`}>
            <div
              className={`nav-hd${curCat === cat ? ' active' : ''}`}
              onClick={() => { onToggleSection(cat); onSelectCat(cat) }}
            >
              <div className="nav-ic"><Icon cat={cat} /></div>
              <span className="nav-lb">{CAT_LABELS[cat]}</span>
              <span className="nav-cnt">{count(cat)}</span>
              <svg className="chev" viewBox="0 0 24 24" {...S} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            <div className="nav-sub">
              {diagrams.filter(d => d.cat === cat).map(d => (
                <div key={d.id} className="nav-si" onClick={e => { e.stopPropagation(); onOpenModal(d) }}>
                  <span className="nav-dot" />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-fb" onClick={onImport}>
          <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Importar XML</span>
        </div>
        <div className="sb-fb" style={{ marginTop: 4 }}>
          <svg viewBox="0 0 24 24" {...S} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          <span>Configuración</span>
        </div>
      </div>
    </aside>
  )
}
