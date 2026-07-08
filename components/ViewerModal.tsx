'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CATS, type Diagram } from '@/lib/types'
import type { Role } from '@/lib/auth'
import { SvgPanZoom } from '@/lib/svg-pan-zoom'

type Tool = 'select' | 'pan' | 'rect' | 'ellipse' | 'diamond' | 'text' | 'arrow'

const NS = 'http://www.w3.org/2000/svg'
let _sid = 0
const newId = () => `eds-${++_sid}`

interface DrawState { sx: number; sy: number; prevX: number; prevY: number; moved: boolean }

const S = { stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function TB({ title, active, onClick, disabled, children }: {
  title: string; active?: boolean; onClick?: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <button className={`et-btn${active ? ' et-active' : ''}${disabled ? ' et-dis' : ''}`}
      title={title} onClick={onClick} disabled={disabled} tabIndex={-1}>
      {children}
    </button>
  )
}

interface Props {
  diagram: Diagram | null
  onClose: () => void
  onEditXml: (d: Diagram) => void
  role: Role
}

export default function ViewerModal({ diagram, onClose, onEditXml, role }: Props) {
  const pzRef = useRef<SvgPanZoom | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const drawRef = useRef<DrawState | null>(null)

  const [tool, setTool] = useState<Tool>('pan')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const open = !!diagram
  const hasSvg = !!diagram?.svgCache

  /* ── SVG helpers ──────────────────────────────────────────── */
  const getSvg = useCallback(() =>
    viewerRef.current?.querySelector('svg') as SVGSVGElement | null, [])

  const screenToSvg = useCallback((cx: number, cy: number) => {
    const svg = getSvg()
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = cx; pt.y = cy
    return pt.matrixTransform(ctm.inverse())
  }, [getSvg])

  const getOrCreateLayer = useCallback(() => {
    const svg = getSvg()
    if (!svg) return null
    let g = svg.getElementById('editor-layer') as SVGGElement | null
    if (!g) {
      g = document.createElementNS(NS, 'g') as SVGGElement
      g.setAttribute('id', 'editor-layer')
      svg.appendChild(g)
    }
    return g
  }, [getSvg])

  const updateSelBox = useCallback((id: string | null) => {
    const svg = getSvg()
    if (!svg) return
    svg.getElementById('sel-indicator')?.remove()
    if (!id) return
    const el = svg.querySelector(`[data-eds="${id}"]`) as SVGGraphicsElement | null
    if (!el) return
    try {
      const b = el.getBBox()
      const pad = 5
      const ind = document.createElementNS(NS, 'rect')
      ind.setAttribute('id', 'sel-indicator')
      ind.setAttribute('x', String(b.x - pad)); ind.setAttribute('y', String(b.y - pad))
      ind.setAttribute('width', String(b.width + pad * 2)); ind.setAttribute('height', String(b.height + pad * 2))
      ind.setAttribute('fill', 'none'); ind.setAttribute('stroke', '#2563eb')
      ind.setAttribute('stroke-width', '1.5'); ind.setAttribute('stroke-dasharray', '6 3')
      ind.setAttribute('pointer-events', 'none')
      svg.appendChild(ind)
    } catch { /* hidden element */ }
  }, [getSvg])

  const ensureMarker = useCallback(() => {
    const svg = getSvg()
    if (!svg || svg.getElementById('eds-arrow-mk')) return
    let defs = svg.querySelector('defs') as SVGDefsElement | null
    if (!defs) { defs = document.createElementNS(NS, 'defs') as SVGDefsElement; svg.insertBefore(defs, svg.firstChild) }
    const mk = document.createElementNS(NS, 'marker')
    mk.setAttribute('id', 'eds-arrow-mk'); mk.setAttribute('markerWidth', '10'); mk.setAttribute('markerHeight', '7')
    mk.setAttribute('refX', '9'); mk.setAttribute('refY', '3.5'); mk.setAttribute('orient', 'auto')
    const p = document.createElementNS(NS, 'polygon')
    p.setAttribute('points', '0 0, 10 3.5, 0 7'); p.setAttribute('fill', '#4b5563')
    mk.appendChild(p); defs.appendChild(mk)
  }, [getSvg])

  /* ── shape operations ─────────────────────────────────────── */
  const addShape = useCallback((type: Tool, x: number, y: number, w: number, h: number) => {
    const layer = getOrCreateLayer()
    if (!layer) return
    const id = newId()
    const fill = '#ffffff', stroke = '#4b5563', sw = '1.5'
    let el: SVGElement

    if (type === 'rect') {
      el = document.createElementNS(NS, 'rect')
      el.setAttribute('x', String(x)); el.setAttribute('y', String(y))
      el.setAttribute('width', String(w)); el.setAttribute('height', String(h)); el.setAttribute('rx', '3')
    } else if (type === 'ellipse') {
      el = document.createElementNS(NS, 'ellipse')
      el.setAttribute('cx', String(x + w / 2)); el.setAttribute('cy', String(y + h / 2))
      el.setAttribute('rx', String(w / 2)); el.setAttribute('ry', String(h / 2))
    } else if (type === 'diamond') {
      const cx = x + w / 2, cy = y + h / 2
      el = document.createElementNS(NS, 'polygon')
      el.setAttribute('points', `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`)
    } else if (type === 'arrow') {
      ensureMarker()
      el = document.createElementNS(NS, 'line')
      el.setAttribute('x1', String(x)); el.setAttribute('y1', String(y))
      el.setAttribute('x2', String(x + w)); el.setAttribute('y2', String(y + h))
      el.setAttribute('marker-end', 'url(#eds-arrow-mk)')
      el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', sw)
      el.setAttribute('data-eds', id); layer.appendChild(el)
      setUndoStack(s => [...s, id]); return
    } else { return }

    el.setAttribute('fill', fill); el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', sw)
    el.setAttribute('data-eds', id)
    layer.appendChild(el)
    setUndoStack(s => [...s, id])
  }, [getOrCreateLayer, ensureMarker])

  const addText = useCallback((cx: number, cy: number) => {
    const pt = screenToSvg(cx, cy)
    if (!pt) return
    const text = window.prompt('Texto:', 'Label')
    if (!text) return
    const layer = getOrCreateLayer()
    if (!layer) return
    const id = newId()
    const el = document.createElementNS(NS, 'text')
    el.setAttribute('x', String(pt.x)); el.setAttribute('y', String(pt.y))
    el.setAttribute('font-size', '14'); el.setAttribute('fill', '#1f2937')
    el.setAttribute('font-family', "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif")
    el.setAttribute('data-eds', id)
    el.textContent = text
    layer.appendChild(el)
    setUndoStack(s => [...s, id])
  }, [screenToSvg, getOrCreateLayer])

  const undo = useCallback(() => {
    if (!undoStack.length) return
    const lastId = undoStack[undoStack.length - 1]
    getSvg()?.querySelector(`[data-eds="${lastId}"]`)?.remove()
    getSvg()?.getElementById('sel-indicator')?.remove()
    if (selectedId === lastId) setSelectedId(null)
    setUndoStack(s => s.slice(0, -1))
  }, [undoStack, selectedId, getSvg])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    getSvg()?.querySelector(`[data-eds="${selectedId}"]`)?.remove()
    getSvg()?.getElementById('sel-indicator')?.remove()
    setUndoStack(s => s.filter(i => i !== selectedId))
    setSelectedId(null)
  }, [selectedId, getSvg])

  /* ── save / download ──────────────────────────────────────── */
  const handleSave = async () => {
    if (!diagram) return
    const svg = getSvg()
    if (!svg) return
    setIsSaving(true)
    try {
      svg.getElementById('sel-indicator')?.remove()
      setSelectedId(null)
      const svgString = new XMLSerializer().serializeToString(svg)
      const res = await fetch(`/api/diagrams/${diagram.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svgCache: svgString }),
      })
      if (!res.ok) throw new Error()
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { alert('Error al guardar') }
    finally { setIsSaving(false) }
  }

  const handleDownload = () => {
    if (!diagram) return
    const safe = diagram.name.replace(/[^a-z0-9]/gi, '_')
    if (diagram.svgCache) {
      const svg = getSvg()
      const str = svg ? new XMLSerializer().serializeToString(svg) : diagram.svgCache
      const blob = new Blob([str], { type: 'image/svg+xml' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = safe + '.svg'; a.click(); URL.revokeObjectURL(a.href)
    } else if (diagram.imageData) {
      const ext = (diagram.imageData.match(/^data:image\/([^;]+)/) || [])[1] || 'png'
      const a = document.createElement('a'); a.href = diagram.imageData; a.download = safe + '.' + (ext === 'jpeg' ? 'jpg' : ext); a.click()
    } else if (diagram.filePath) {
      const a = document.createElement('a'); a.href = diagram.filePath; a.download = diagram.name; a.click()
    }
  }

  /* ── effects ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      pzRef.current?.destroy(); pzRef.current = null
      setTool('pan'); setSelectedId(null); setUndoStack([]); setPreview(null)
      return
    }
    if (!diagram?.svgCache || !viewerRef.current) return
    const tmp = document.createElement('div')
    tmp.innerHTML = diagram.svgCache
    const svgEl = tmp.querySelector('svg') as SVGElement | null
    if (!svgEl) return
    const pz = new SvgPanZoom(viewerRef.current, svgEl)
    pzRef.current = pz; pz.mount()
    return () => { pz.destroy(); pzRef.current = null }
  }, [diagram, open])

  useEffect(() => { pzRef.current?.setDragEnabled(tool === 'pan') }, [tool])

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      pzRef.current?.zoomBy(e.deltaY < 0 ? 1.12 : 0.88, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'Escape') {
        if (selectedId) { setSelectedId(null); getSvg()?.getElementById('sel-indicator')?.remove() }
        else onClose()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { deleteSelected(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
      if (!e.ctrlKey && !e.metaKey && hasSvg) {
        if (e.key === 'v') setTool('select')
        if (e.key === 'h') setTool('pan')
        if (e.key === 'r') setTool('rect')
        if (e.key === 'e') setTool('ellipse')
        if (e.key === 'd') setTool('diamond')
        if (e.key === 'a') setTool('arrow')
        if (e.key === 't') setTool('text')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, selectedId, deleteSelected, undo, getSvg, hasSvg])

  /* ── pointer handlers ─────────────────────────────────────── */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'pan') return
    e.preventDefault()
    drawRef.current = { sx: e.clientX, sy: e.clientY, prevX: e.clientX, prevY: e.clientY, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = drawRef.current
    if (!d || tool === 'pan') return
    d.moved = true

    if (tool === 'select' && selectedId) {
      const p1 = screenToSvg(d.prevX, d.prevY)
      const p2 = screenToSvg(e.clientX, e.clientY)
      if (p1 && p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y
        const el = getSvg()?.querySelector(`[data-eds="${selectedId}"]`) as SVGGraphicsElement | null
        if (el) {
          const cur = el.getAttribute('transform') || ''
          const m = cur.match(/translate\(([-\d.]+)[, ]+([-\d.]+)\)/)
          const ox = m ? +m[1] : 0, oy = m ? +m[2] : 0
          el.setAttribute('transform', `translate(${ox + dx},${oy + dy})`)
          updateSelBox(selectedId)
        }
      }
      d.prevX = e.clientX; d.prevY = e.clientY
      return
    }

    if (tool === 'text' || tool === 'select') return
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPreview({
      x: Math.min(e.clientX, d.sx) - rect.left,
      y: Math.min(e.clientY, d.sy) - rect.top,
      w: Math.abs(e.clientX - d.sx),
      h: Math.abs(e.clientY - d.sy),
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = drawRef.current
    drawRef.current = null; setPreview(null)
    if (!d) return

    if (tool === 'select') {
      if (!d.moved || (Math.abs(e.clientX - d.sx) < 4 && Math.abs(e.clientY - d.sy) < 4)) {
        const pt = screenToSvg(e.clientX, e.clientY)
        let found: string | null = null
        if (pt) {
          getSvg()?.getElementById('editor-layer')?.querySelectorAll('[data-eds]').forEach(el => {
            try {
              const b = (el as SVGGraphicsElement).getBBox()
              const tx = el.getAttribute('transform') || ''
              const tm = tx.match(/translate\(([-\d.]+)[, ]+([-\d.]+)\)/)
              const ox = tm ? +tm[1] : 0, oy = tm ? +tm[2] : 0
              if (pt.x >= b.x + ox && pt.x <= b.x + b.width + ox &&
                  pt.y >= b.y + oy && pt.y <= b.y + b.height + oy)
                found = el.getAttribute('data-eds')
            } catch { /* skip */ }
          })
        }
        setSelectedId(found); updateSelBox(found)
      }
      return
    }

    if (tool === 'text') { addText(e.clientX, e.clientY); return }
    if (!d.moved || Math.abs(e.clientX - d.sx) < 5 || Math.abs(e.clientY - d.sy) < 5) return
    const p1 = screenToSvg(d.sx, d.sy)
    const p2 = screenToSvg(e.clientX, e.clientY)
    if (!p1 || !p2) return
    addShape(tool, Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y))
  }

  /* ── render ───────────────────────────────────────────────── */
  const hints: Partial<Record<Tool, string>> = {
    select: 'Seleccionar · Mover · Del para eliminar',
    rect: 'Arrastrar para dibujar un rectángulo',
    ellipse: 'Arrastrar para dibujar una elipse',
    diamond: 'Arrastrar para dibujar un rombo',
    arrow: 'Arrastrar para trazar una flecha',
    text: 'Clic donde quieres colocar el texto',
  }

  return (
    <div className={`mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mo-box">

        {/* HEADER */}
        <div className="mo-top">
          <span className="mo-title">{diagram?.name || '—'}</span>
          <span className={`tag ${CATS[diagram?.cat || '']?.tag || ''}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>
            {CATS[diagram?.cat || '']?.label || diagram?.cat || '—'}
          </span>
          <button className="mo-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* TOOLBAR — always visible */}
        <div className="editor-toolbar">

          {/* SVG-only, admin-only: history + drawing tools */}
          {hasSvg && role === 'admin' && (
            <>
              <div className="et-grp">
                <TB title="Deshacer (Ctrl+Z)" onClick={undo} disabled={!undoStack.length}>
                  <svg viewBox="0 0 24 24" {...S}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                </TB>
              </div>
              <span className="et-sep"/>
              <div className="et-grp">
                <TB title="Seleccionar / Mover (V)" active={tool === 'select'} onClick={() => setTool('select')}>
                  <svg viewBox="0 0 20 20" fill={tool === 'select' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2l12 9-5.5 1-2.5 6z"/>
                  </svg>
                </TB>
                <TB title="Mover canvas (H)" active={tool === 'pan'} onClick={() => setTool('pan')}>
                  <svg viewBox="0 0 24 24" {...S} strokeWidth={1.8}>
                    <path d="M18 11V6a2 2 0 0 0-4 0v1M14 7V5a2 2 0 0 0-4 0v2M10 7.5V6a2 2 0 0 0-4 0v7M6 13s-2 0-2 3c0 2 1.5 4 4 4h4c3 0 5-2 5-5v-3a2 2 0 0 0-4 0"/>
                  </svg>
                </TB>
              </div>
              <span className="et-sep"/>
              <div className="et-grp">
                <TB title="Rectángulo (R)" active={tool === 'rect'} onClick={() => setTool('rect')}>
                  <svg viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="18" height="14" rx="2.5"/></svg>
                </TB>
                <TB title="Elipse (E)" active={tool === 'ellipse'} onClick={() => setTool('ellipse')}>
                  <svg viewBox="0 0 24 24" {...S}><ellipse cx="12" cy="12" rx="9" ry="6"/></svg>
                </TB>
                <TB title="Rombo (D)" active={tool === 'diamond'} onClick={() => setTool('diamond')}>
                  <svg viewBox="0 0 24 24" {...S}><polygon points="12,2 22,12 12,22 2,12"/></svg>
                </TB>
                <TB title="Flecha (A)" active={tool === 'arrow'} onClick={() => setTool('arrow')}>
                  <svg viewBox="0 0 24 24" {...S}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
                </TB>
                <TB title="Texto (T)" active={tool === 'text'} onClick={() => setTool('text')}>
                  <svg viewBox="0 0 24 24" {...S}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                </TB>
              </div>
              <span className="et-sep"/>
              <div className="et-grp">
                <TB title="Eliminar seleccionado (Del)" onClick={deleteSelected} disabled={!selectedId}>
                  <svg viewBox="0 0 24 24" {...S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </TB>
              </div>
              <span className="et-sep"/>
            </>
          )}

          {/* Pan/zoom always visible for SVG */}
          {hasSvg && (
            <div className="et-grp">
              <TB title="Acercar" onClick={() => pzRef.current?.zoomBy(1.2)}>
                <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </TB>
              <TB title="Ajustar al área" onClick={() => pzRef.current?.fit()}>
                <svg viewBox="0 0 24 24" {...S}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </TB>
              <TB title="Alejar" onClick={() => pzRef.current?.zoomBy(0.83)}>
                <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </TB>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }}/>

          {/* Download always visible; edit XML + save admin-only */}
          <div className="et-grp">
            {hasSvg && role === 'admin' && (
              <TB title="Editar XML fuente" onClick={() => { onClose(); if (diagram) onEditXml(diagram) }}>
                <svg viewBox="0 0 24 24" {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </TB>
            )}
            <TB title="Descargar" onClick={handleDownload}>
              <svg viewBox="0 0 24 24" {...S}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </TB>
            {hasSvg && role === 'admin' && undoStack.length > 0 && (
              <button
                className={`et-btn et-save${saved ? ' et-saved' : ''}`}
                onClick={handleSave} disabled={isSaving}
                title="Guardar cambios en base de datos"
              >
                <svg viewBox="0 0 24 24" {...S}>
                  {saved
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>
                  }
                </svg>
                <span>{isSaving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="mo-body">
          {diagram?.svgCache ? (
            <>
              <div ref={viewerRef} className="svg-viewer" style={{ width: '100%', height: '100%', overflow: 'hidden' }}/>
              <div
                ref={overlayRef}
                style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  cursor: tool === 'pan' ? 'default' : tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair',
                  pointerEvents: tool === 'pan' ? 'none' : 'all',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {preview && (
                  <div style={{
                    position: 'absolute',
                    left: preview.x, top: preview.y, width: preview.w, height: preview.h,
                    border: '2px dashed #2563eb', background: 'rgba(37,99,235,0.07)',
                    borderRadius: tool === 'ellipse' ? '50%' : 3,
                    pointerEvents: 'none', boxSizing: 'border-box',
                  }}/>
                )}
              </div>
              {tool !== 'pan' && hints[tool] && (
                <div className="et-hint">{hints[tool]}</div>
              )}
            </>
          ) : diagram?.imageData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={diagram.imageData} alt={diagram.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6, boxShadow: 'var(--sh-hv)', margin: 24 }}/>
          ) : diagram?.filePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={diagram.filePath} alt={diagram.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6, boxShadow: 'var(--sh-hv)', margin: 24 }}/>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="mo-foot">
          <span style={{ flex: 1, color: 'var(--tx2)', fontSize: 12.5 }}>{diagram?.description || ''}</span>
        </div>

      </div>
    </div>
  )
}
