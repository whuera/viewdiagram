'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { type Diagram } from '@/lib/types'
import { DrawioRenderer } from '@/lib/drawio-renderer'

interface Props {
  open: boolean
  editing: Diagram | null
  defaultCat?: string
  onClose: () => void
  onSaved: (d: Diagram) => void
}

function isImgFile(f: File) {
  return /\.(svg|png|jpe?g|webp|gif)$/i.test(f.name) || f.type.startsWith('image/')
}

export default function ImportModal({ open, editing, defaultCat, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState('cl')
  const [desc, setDesc] = useState('')
  const [xmlVal, setXmlVal] = useState('')
  const [imgUrl, setImgUrl] = useState('')
  const [isImage, setIsImage] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewInfo, setPreviewInfo] = useState('')
  const [previewVisible, setPreviewVisible] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [dzOver, setDzOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const pvTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const title = editing
    ? (editing.svgCache ? `Actualizar XML — ${editing.name}` : `Importar — ${editing.name}`)
    : 'Importar diagrama'

  useEffect(() => {
    if (!open) return
    setName(editing?.name || '')
    setDesc(editing?.description || '')
    setCat(editing?.cat || defaultCat || 'cl')
    setXmlVal(editing?.sourceXml || '')
    setImgUrl('')
    setIsImage(false)
    setPreviewVisible(false)
    setPreviewHtml('')
    setPreviewInfo('')
    setErrMsg('')
    try { if (fileRef.current) fileRef.current.value = '' } catch (_) {}
    setTimeout(() => nameRef.current?.focus(), 200)
    if (editing?.sourceXml) setTimeout(() => doPreviewXml(editing.sourceXml!), 300)
    else if (editing?.imageData) setTimeout(() => { setIsImage(true); setImgUrl(editing.imageData!); setPreviewVisible(true); setPreviewHtml(`<img src="${editing.imageData}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px"/>`) }, 300)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const doPreviewXml = useCallback(async (raw: string) => {
    if (!raw.trim()) return
    setErrMsg('')
    setPreviewHtml('<div style="padding:20px;font-size:12px;color:var(--tx3)">Renderizando…</div>')
    setPreviewVisible(true)
    try {
      const renderer = await DrawioRenderer.fromString(raw)
      const svgEl = renderer.render()
      const b = renderer.bounds()
      setPreviewInfo(`${Math.round(b.w)}×${Math.round(b.h)} px`)
      svgEl.style.maxWidth = '100%'; svgEl.style.maxHeight = '100%'
      svgEl.removeAttribute('width'); svgEl.removeAttribute('height')
      setPreviewHtml(svgEl.outerHTML)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPreviewHtml(`<div class="imp-preview-err">${msg}</div>`)
      setPreviewInfo('')
      setErrMsg('XML inválido — revisa el contenido')
    }
  }, [])

  function loadImgFile(f: File) {
    const r = new FileReader()
    r.onload = ev => {
      const url = ev.target!.result as string
      setIsImage(true); setImgUrl(url); setXmlVal('')
      setPreviewVisible(true)
      setPreviewHtml(`<img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px" onerror="this.parentElement.innerHTML='<div class=imp-preview-err>No se pudo cargar</div>'"/>`)
      setPreviewInfo(f.name)
      setErrMsg('')
    }
    r.readAsDataURL(f)
  }

  function handleFile(f: File) {
    if (isImgFile(f)) { loadImgFile(f) }
    else {
      setIsImage(false); setImgUrl('')
      const r = new FileReader()
      r.onload = ev => { const v = ev.target!.result as string; setXmlVal(v); doPreviewXml(v) }
      r.readAsText(f)
    }
  }

  function handleXmlChange(v: string) {
    setXmlVal(v); setIsImage(false); setImgUrl('')
    if (pvTimer.current) clearTimeout(pvTimer.current)
    pvTimer.current = setTimeout(() => { if (v.trim().length > 20) doPreviewXml(v) }, 600)
  }

  async function handleSave() {
    const trimName = name.trim()
    setErrMsg('')
    if (!trimName) {
      nameRef.current?.focus()
      nameRef.current!.style.borderColor = '#ef4444'
      setTimeout(() => { if (nameRef.current) nameRef.current.style.borderColor = '' }, 1500)
      setErrMsg('Completa el nombre del diagrama'); return
    }
    if (!isImage && !xmlVal.trim()) {
      setErrMsg('Carga un archivo o pega el XML'); return
    }
    setSaving(true)
    try {
      let payload: Record<string, unknown>
      if (isImage && imgUrl) {
        payload = { name: trimName, cat, description: desc.trim() || 'Imagen importada', imageData: imgUrl, svgCache: null, sourceXml: null, filePath: null }
      } else {
        const renderer = await DrawioRenderer.fromString(xmlVal)
        const svgEl = renderer.render()
        payload = { name: trimName, cat, description: desc.trim() || 'Importado desde draw.io', svgCache: svgEl.outerHTML, sourceXml: xmlVal, imageData: null, filePath: null }
      }

      let res: Response
      if (editing) {
        res = await fetch(`/api/diagrams/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await fetch('/api/diagrams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }

      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      onSaved({ ...saved, createdAt: saved.createdAt || new Date().toISOString(), updatedAt: saved.updatedAt || new Date().toISOString() })
      onClose()
    } catch (err: unknown) {
      setErrMsg('Error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`imp-mo${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="imp-box">
        <div className="imp-head">
          <div className="imp-head-ic">
            <svg viewBox="0 0 24 24" stroke="var(--ac)" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <h3>{title}</h3>
          <button className="mo-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="imp-body">
          <div className="fld">
            <label>Nombre del diagrama *</label>
            <input ref={nameRef} className="imp-inp" type="text" placeholder="Mi diagrama de arquitectura" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="fld">
            <label>Categoría *</label>
            <select className="imp-sel" value={cat} onChange={e => setCat(e.target.value)} disabled={!!(editing && editing.isStatic)}>
              <option value="tx">Arquitectura Transaccional</option>
              <option value="cl">Soluciones Cloud</option>
              <option value="op">Soluciones On-Premise</option>
              <option value="hb">Soluciones Híbridas</option>
            </select>
          </div>
          <div className="fld">
            <label>Descripción (opcional)</label>
            <input className="imp-inp" type="text" placeholder="Descripción breve del diagrama" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="fld">
            <label>Archivo .drawio o .xml</label>
            <div
              className={`dz${dzOver ? ' over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDzOver(true) }}
              onDragLeave={() => setDzOver(false)}
              onDrop={e => { e.preventDefault(); setDzOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p>Arrastra tu archivo aquí</p>
              <small>Formatos: .drawio · .xml · .svg · .png · .jpg · .webp</small>
              <input
                ref={fileRef}
                type="file"
                accept=".drawio,.xml,.drawio.xml,.svg,.png,.jpg,.jpeg,.webp"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          </div>
          <div className="or-sep">o pega el XML directamente</div>
          <div className="fld">
            <label>XML del diagrama</label>
            <textarea
              className="xml-ta"
              placeholder={'<mxGraphModel>...</mxGraphModel>\n\no pega el contenido completo de un archivo .drawio'}
              value={xmlVal}
              onChange={e => handleXmlChange(e.target.value)}
            />
          </div>
          {previewVisible && (
            <div className="imp-preview visible">
              <div className="imp-preview-top">
                <span>Vista previa</span>
                <span style={{ color: 'var(--tx3)' }}>{previewInfo}</span>
              </div>
              <div className="imp-preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>

        <div className="imp-foot">
          <button className="tb-btn" onClick={() => doPreviewXml(xmlVal)}>
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Vista previa</span>
          </button>
          {errMsg ? (
            <span style={{ flex: 1, fontSize: 11.5, color: '#ef4444', padding: '0 8px' }}>{errMsg}</span>
          ) : (
            <span className="spacer" style={{ flex: 1 }} />
          )}
          <button className="tb-btn" onClick={onClose}>Cancelar</button>
          <button className="tb-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar diagrama'}
          </button>
        </div>
      </div>
    </div>
  )
}
