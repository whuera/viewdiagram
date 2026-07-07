'use client'

export interface CellGeo {
  x: number
  y: number
  w: number
  h: number
  rel: boolean
  pts: { x: number; y: number }[]
}

export interface Cell {
  id: string
  value: string
  style: Record<string, string>
  vertex: boolean
  edge: boolean
  source: string | null
  target: string | null
  parent: string | null
  geo: CellGeo | null
}

export type CellMap = Record<string, Cell>

export class DrawioParser {
  static parseStyle(s = ''): Record<string, string> {
    const m: Record<string, string> = {}
    let first = true
    s.split(';').forEach(p => {
      const t = p.trim()
      if (!t) return
      const i = t.indexOf('=')
      if (i === -1) { if (first && t) m._type = t }
      else { m[t.slice(0, i).trim()] = t.slice(i + 1).trim() }
      first = false
    })
    return m
  }

  static decodeVal(s = ''): string {
    return s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }

  static async decompress(b64: string): Promise<string> {
    const cleaned = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
    let bin: string
    try { bin = atob(cleaned) }
    catch (e) { throw new Error('Base64 inválido en el contenido del diagrama') }

    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))

    for (const fmt of ['deflate-raw', 'deflate'] as CompressionFormat[]) {
      try {
        const ds = new DecompressionStream(fmt)
        const wr = ds.writable.getWriter()
        wr.write(bytes); wr.close()
        const rd = ds.readable.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value } = await rd.read()
          if (done) break
          chunks.push(value)
        }
        const len = chunks.reduce((s, c) => s + c.length, 0)
        const out = new Uint8Array(len)
        let off = 0
        for (const c of chunks) { out.set(c, off); off += c.length }
        let result = new TextDecoder().decode(out)
        if (result && !result.trim().startsWith('<')) {
          try { result = decodeURIComponent(result) } catch (_) {}
        }
        if (result && result.includes('<')) return result
      } catch (_) { /* try next format */ }
    }
    throw new Error('No se pudo descomprimir. Verifica que el archivo .drawio sea válido.')
  }

  static async extractXML(raw: string): Promise<string> {
    const s = raw.trim()
    if (s.startsWith('<mxGraphModel')) return s

    const doc = new DOMParser().parseFromString(s, 'text/xml')

    if (!doc.querySelector('parsererror')) {
      const diagramEl = doc.querySelector('diagram')
      if (diagramEl) {
        const mxChild = diagramEl.querySelector('mxGraphModel')
        if (mxChild) return new XMLSerializer().serializeToString(mxChild)

        const rawContent = diagramEl.textContent?.trim() || ''
        if (!rawContent) throw new Error('El diagrama está vacío.')
        let content = rawContent
        try { content = decodeURIComponent(rawContent) } catch (_) { content = rawContent }
        if (content.trim().startsWith('<')) return content
        return await DrawioParser.decompress(content)
      }
      if (doc.querySelector('mxGraphModel')) return s
    }

    try { return await DrawioParser.decompress(s) } catch (_) {}

    throw new Error('Formato no reconocido. Usa un archivo .drawio o pega el XML del diagrama.')
  }

  static async parse(raw: string): Promise<CellMap> {
    const xml = await DrawioParser.extractXML(raw)
    let doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (doc.querySelector('parsererror')) {
      try {
        const dec = decodeURIComponent(xml)
        doc = new DOMParser().parseFromString(dec, 'text/xml')
      } catch (_) {}
      if (doc.querySelector('parsererror')) throw new Error('El XML del diagrama no es válido')
    }
    return DrawioParser._cells(doc)
  }

  static _cells(doc: Document): CellMap {
    const cells: CellMap = {}

    const addCell = (cellEl: Element, id: string | null | undefined, value: string) => {
      if (id === null || id === undefined) return
      const sid = String(id)
      const geoEl = cellEl.querySelector('mxGeometry')
      let pts: { x: number; y: number }[] = []
      if (geoEl) {
        const arr = geoEl.querySelector('Array')
        if (arr) pts = [...arr.querySelectorAll('mxPoint')].map(p => ({
          x: +(p.getAttribute('x') || 0),
          y: +(p.getAttribute('y') || 0),
        }))
      }
      cells[sid] = {
        id: sid,
        value,
        style: DrawioParser.parseStyle(cellEl.getAttribute('style') || ''),
        vertex: cellEl.getAttribute('vertex') === '1',
        edge: cellEl.getAttribute('edge') === '1',
        source: cellEl.getAttribute('source'),
        target: cellEl.getAttribute('target'),
        parent: cellEl.getAttribute('parent'),
        geo: geoEl ? {
          x: +(geoEl.getAttribute('x') || 0),
          y: +(geoEl.getAttribute('y') || 0),
          w: +(geoEl.getAttribute('width') || 0),
          h: +(geoEl.getAttribute('height') || 0),
          rel: geoEl.getAttribute('relative') === '1',
          pts,
        } : null,
      }
    }

    doc.querySelectorAll('UserObject').forEach(uo => {
      const cellEl = uo.querySelector('mxCell')
      if (!cellEl) return
      const id = uo.getAttribute('id') || cellEl.getAttribute('id')
      const value = DrawioParser.decodeVal(uo.getAttribute('label') || uo.getAttribute('value') || '')
      addCell(cellEl, id, value)
    })

    doc.querySelectorAll('mxCell').forEach(el => {
      if (el.parentElement?.tagName === 'UserObject') return
      addCell(el, el.getAttribute('id'), DrawioParser.decodeVal(el.getAttribute('value') || ''))
    })

    return cells
  }
}
