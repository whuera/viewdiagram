'use client'

import { CATS, type Diagram } from '@/lib/types'
import type { Role } from '@/lib/auth'
import DiagramCard from './DiagramCard'

interface Props {
  diagrams: Diagram[]
  curCat: string
  curView: 'grid' | 'list'
  onOpenModal: (d: Diagram) => void
  onOpenImport: (d: Diagram) => void
  onDelete: (d: Diagram) => void
  onDownload: (d: Diagram) => void
  onDrop: (f: File) => void
  onImportNew: () => void
  role: Role
}

const S = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const CAT_ICONS: Record<string, React.ReactNode> = {
  tx: <svg viewBox="0 0 24 24" {...S}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  cl: <svg viewBox="0 0 24 24" {...S}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  op: <svg viewBox="0 0 24 24" {...S}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  hb: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
}

const CAT_TITLES: Record<string, string> = {
  tx: 'Arquitectura Transaccional',
  cl: 'Soluciones Cloud',
  op: 'Soluciones On-Premise',
  hb: 'Soluciones Híbridas',
}

export default function Canvas({ diagrams, curCat, curView, onOpenModal, onOpenImport, onDelete, onDownload, onDrop, onImportNew, role }: Props) {
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }
  const handleDragLeave = (e: React.DragEvent) => e.currentTarget.classList.remove('drag-over')
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const f = e.dataTransfer.files[0]
    if (f) onDrop(f)
  }

  const cats = (['tx', 'cl', 'op', 'hb'] as const).filter(cat => curCat === 'all' || curCat === cat)

  return (
    <div
      className="canvas-wrap"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-hint">
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Suelta aquí — .drawio · .xml · .svg · .png · .jpg</span>
      </div>

      <div className="canvas">
        {cats.map(cat => {
          const items = diagrams.filter(d => d.cat === cat)
          return (
            <div key={cat} className={`cat-sec visible cat--${cat}`} id={`sec-${cat}`}>
              <div className="cat-hd">
                <div className="cat-icw">{CAT_ICONS[cat]}</div>
                <span className="cat-title">{CAT_TITLES[cat]}</span>
                <span className="cat-sub">{items.length} diagrama{items.length !== 1 ? 's' : ''}</span>
                <div className="cat-ln" />
              </div>
              <div className={`dg${curView === 'list' ? ' list' : ''}`}>
                {items.length === 0 ? (
                  <div className="empty-st">
                    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>
                    <span>Sin diagramas en esta categoría</span>
                  </div>
                ) : (
                  items.map(d => (
                    <DiagramCard
                      key={d.id}
                      diagram={d}
                      view={curView}
                      onClick={() => onOpenModal(d)}
                      onImport={() => onOpenImport(d)}
                      onDelete={() => onDelete(d)}
                      onDownload={() => onDownload(d)}
                      role={role}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
