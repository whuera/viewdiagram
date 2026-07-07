'use client'

import { useEffect, useRef } from 'react'
import { CATS, type Diagram } from '@/lib/types'
import { SvgPanZoom } from '@/lib/svg-pan-zoom'

interface Props {
  diagram: Diagram | null
  onClose: () => void
  onEditXml: (d: Diagram) => void
}

export default function ViewerModal({ diagram, onClose, onEditXml }: Props) {
  const pzRef = useRef<SvgPanZoom | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const open = !!diagram

  useEffect(() => {
    if (!open) {
      if (pzRef.current) { pzRef.current.destroy(); pzRef.current = null }
      return
    }
    if (!diagram?.svgCache || !viewerRef.current) return

    const tmp = document.createElement('div')
    tmp.innerHTML = diagram.svgCache
    const svgEl = tmp.querySelector('svg') as SVGElement | null
    if (!svgEl) return

    const pz = new SvgPanZoom(viewerRef.current, svgEl)
    pzRef.current = pz
    pz.mount()
    return () => { pz.destroy(); pzRef.current = null }
  }, [diagram, open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleDownload() {
    if (!diagram) return
    const safe = diagram.name.replace(/[^a-z0-9]/gi, '_')
    if (diagram.svgCache) {
      const blob = new Blob([diagram.svgCache], { type: 'image/svg+xml' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = safe + '.svg'; a.click(); URL.revokeObjectURL(a.href)
    } else if (diagram.imageData) {
      const ext = (diagram.imageData.match(/^data:image\/([^;]+)/) || [])[1] || 'png'
      const a = document.createElement('a'); a.href = diagram.imageData; a.download = safe + '.' + (ext === 'jpeg' ? 'jpg' : ext); a.click()
    } else if (diagram.filePath) {
      const a = document.createElement('a'); a.href = diagram.filePath; a.download = diagram.name; a.click()
    }
  }

  return (
    <div className={`mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mo-box">
        <div className="mo-top">
          <span className="mo-title">{diagram?.name || '—'}</span>
          <span className={`tag ${CATS[diagram?.cat || '']?.tag || ''}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>
            {CATS[diagram?.cat || '']?.label || diagram?.cat || '—'}
          </span>
          <button className="mo-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="mo-body">
          {diagram?.svgCache ? (
            <>
              <div ref={viewerRef} className="svg-viewer" style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
              <div className="zoom-ctl visible">
                <button className="zb" title="Acercar" onClick={() => pzRef.current?.zoomBy(1.2)}>
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button className="zb" title="Alejar" onClick={() => pzRef.current?.zoomBy(.83)}>
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button className="zb" title="Ajustar" onClick={() => pzRef.current?.fit()}>
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
                <button className="zb" title="100%" onClick={() => pzRef.current?.reset()}>
                  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                </button>
              </div>
            </>
          ) : diagram?.imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={diagram.imageData} alt={diagram.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6, boxShadow: 'var(--sh-hv)', margin: 24 }} />
          ) : diagram?.filePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={diagram.filePath} alt={diagram.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6, boxShadow: 'var(--sh-hv)', margin: 24 }} />
          ) : null}
        </div>

        <div className="mo-foot">
          <span style={{ flex: 1, color: 'var(--tx2)', fontSize: 12.5 }}>{diagram?.description || ''}</span>
          <button className="tb-btn" onClick={handleDownload}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Descargar</span>
          </button>
          {diagram?.svgCache && (
            <button className="tb-btn" onClick={() => { onClose(); if (diagram) onEditXml(diagram) }}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Editar XML</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
