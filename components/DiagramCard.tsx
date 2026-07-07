'use client'

import { useState } from 'react'
import { CATS, type Diagram } from '@/lib/types'

interface Props {
  diagram: Diagram
  view: 'grid' | 'list'
  onClick: () => void
  onImport: () => void
  onDelete: () => void
  onDownload: () => void
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  tx: (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  cl: (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
  op: (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  hb: (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
}

function Placeholder({ cat }: { cat: string }) {
  return (
    <div className="card-thumb-ph">
      {CAT_ICONS[cat] || CAT_ICONS.cl}
    </div>
  )
}

function FileImage({ src, alt, cat }: { src: string; alt: string; cat: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!loaded && <Placeholder cat={cat} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded ? 'block' : 'none' }}
        onLoad={() => setLoaded(true)}
        onError={() => { /* placeholder already showing */ }}
      />
    </div>
  )
}

export default function DiagramCard({ diagram: d, view, onClick, onImport, onDelete, onDownload }: Props) {
  const isList = view === 'list'
  const hasContent = !!(d.svgCache || d.imageData)
  const showImportHint = !hasContent

  function renderThumb() {
    if (d.svgCache) {
      return (
        <div
          className="card-svg-wrap"
          dangerouslySetInnerHTML={{
            __html: d.svgCache.replace(/^(<svg\s)/, '$1style="width:100%;height:100%;pointer-events:none" '),
          }}
        />
      )
    }
    if (d.imageData) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.imageData}
          alt={d.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )
    }
    if (d.filePath) {
      return <FileImage src={d.filePath} alt={d.name} cat={d.cat} />
    }
    return <Placeholder cat={d.cat} />
  }

  return (
    <div className={`card${isList ? ' list' : ''}`} onClick={onClick}>
      <div className="card-thumb">
        {renderThumb()}
      </div>

      {d.svgCache && <div className="drawio-badge">draw.io</div>}
      {showImportHint && <div className="import-hint">+ importar</div>}

      <div className="card-body">
        <div className="card-name">{d.name}</div>
        {!isList && (
          <div className="card-meta">
            <span className={`tag ${CATS[d.cat]?.tag || ''}`}>{CATS[d.cat]?.label || d.cat}</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button
          className="card-act-btn"
          title={d.svgCache ? 'Actualizar XML draw.io' : !d.isStatic ? 'Reemplazar archivo' : 'Importar imagen o XML'}
          onClick={e => { e.stopPropagation(); onImport() }}
        >
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>
        {hasContent && (
          <>
            <button
              className="card-act-btn"
              title={d.svgCache ? 'Descargar SVG' : 'Descargar imagen'}
              onClick={e => { e.stopPropagation(); onDownload() }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            {!d.isStatic && (
              <button
                className="card-act-btn danger"
                title="Eliminar"
                onClick={e => { e.stopPropagation(); onDelete() }}
              >
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
