'use client'

import { DrawioParser, type Cell, type CellMap, type CellGeo } from './drawio-parser'

const NS = 'http://www.w3.org/2000/svg'

function mkEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const el = document.createElementNS(NS, tag) as SVGElement
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
  return el
}

export class DrawioRenderer {
  private cells: CellMap
  private defs: SVGElement | null = null
  private _markers = new Set<string>()

  constructor(cells: CellMap) {
    this.cells = cells
  }

  absGeo(cell: Cell): CellGeo | null {
    if (!cell.geo) return null
    const g = { ...cell.geo }
    let pid = cell.parent
    const seen = new Set<string>()
    while (pid && pid !== '0' && pid !== '1' && !seen.has(pid)) {
      seen.add(pid)
      const par = this.cells[pid]
      if (!par?.geo) break
      const ss = +(par.style.startSize || (par.style._type === 'swimlane' ? 23 : 0))
      g.x += par.geo.x
      g.y += par.geo.y + (par.style._type === 'swimlane' || par.style.swimlane ? ss : 0)
      pid = par.parent
    }
    return g
  }

  bounds(): { x: number; y: number; w: number; h: number } {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false
    Object.values(this.cells).forEach(c => {
      if (!c.vertex || !c.geo || c.id === '0' || c.id === '1') return
      const g = this.absGeo(c)
      if (!g) return
      x0 = Math.min(x0, g.x); y0 = Math.min(y0, g.y)
      x1 = Math.max(x1, g.x + g.w); y1 = Math.max(y1, g.y + g.h)
      any = true
    })
    if (!any) return { x: 0, y: 0, w: 400, h: 300 }
    const pad = 20
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
  }

  render(): SVGElement {
    const b = this.bounds()
    const svg = mkEl('svg', {
      xmlns: NS,
      viewBox: `${b.x} ${b.y} ${b.w} ${b.h}`,
      width: b.w,
      height: b.h,
    })
    ;(svg as SVGSVGElement).style.fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    this.defs = mkEl('defs')
    svg.appendChild(this.defs)

    const verts = Object.values(this.cells).filter(c => c.vertex && c.id !== '0' && c.id !== '1' && c.geo)
    const edges = Object.values(this.cells).filter(c => c.edge)

    const sorted: Cell[] = [], added = new Set<string>()
    const addV = (c: Cell) => {
      if (added.has(c.id)) return
      const par = c.parent ? this.cells[c.parent] : null
      if (par?.vertex && !added.has(par.id)) addV(par)
      added.add(c.id); sorted.push(c)
    }
    verts.forEach(addV)

    sorted.forEach(c => this._vertex(svg, c))
    edges.forEach(e => this._edge(svg, e))
    return svg
  }

  private _color(v: string | undefined, def: string): string {
    if (!v || v === 'default') return def
    if (v === 'none') return 'none'
    return v
  }

  private _gradient(c1: string, c2: string, dir: string): string {
    const id = 'g_' + (Math.random() * 1e9 | 0)
    const grad = mkEl('linearGradient', { id })
    const dirs: Record<string, string[]> = {
      south: ['0%', '0%', '0%', '100%'],
      north: ['0%', '100%', '0%', '0%'],
      east: ['0%', '0%', '100%', '0%'],
      west: ['100%', '0%', '0%', '0%'],
    }
    const [x1, y1, x2, y2] = dirs[dir] || dirs.south
    grad.setAttribute('x1', x1); grad.setAttribute('y1', y1)
    grad.setAttribute('x2', x2); grad.setAttribute('y2', y2)
    ;[c1, c2].forEach((c, i) => {
      const s = mkEl('stop', { offset: i === 0 ? '0%' : '100%', 'stop-color': c })
      grad.appendChild(s)
    })
    this.defs!.appendChild(grad)
    return `url(#${id})`
  }

  private _vertex(svg: SVGElement, cell: Cell) {
    const g = this.absGeo(cell)
    if (!g || g.w <= 0 || g.h <= 0) return
    const s = cell.style
    const fill = this._color(s.fillColor, '#ffffff')
    const stroke = this._color(s.strokeColor, '#82b366')
    const sw = +(s.strokeWidth || 1)
    const dashed = s.dashed === '1'
    const opacity = +(s.opacity || 100) / 100
    const fillAttr = s.gradientColor && s.gradientColor !== 'none' && s.gradientColor !== fill
      ? this._gradient(fill, s.gradientColor, s.gradientDirection || 'south')
      : fill

    const grp = mkEl('g')
    if (opacity < 1) grp.setAttribute('opacity', String(opacity))

    const shape = this._shape(s._type || s.shape || '', g, fillAttr, stroke, sw, dashed, s)
    if (shape) grp.appendChild(shape)

    const lbl = this._label(cell.value, g, s, s._type || s.shape || '')
    if (lbl) grp.appendChild(lbl)

    svg.appendChild(grp)
  }

  private _shape(
    name: string,
    g: CellGeo,
    fill: string,
    stroke: string,
    sw: number,
    dashed: boolean,
    s: Record<string, string>
  ): SVGElement | null {
    const { x, y, w, h } = g
    const cx = x + w / 2, cy = y + h / 2
    const da = dashed ? '6,4' : null
    const rx = s.rounded === '1' ? Math.min(+(s.arcSize || 10) * Math.min(w, h) / 100, w / 2, h / 2) : 0
    const ap = (el: SVGElement) => {
      el.setAttribute('fill', fill)
      el.setAttribute('stroke', stroke)
      el.setAttribute('stroke-width', String(sw))
      if (da) el.setAttribute('stroke-dasharray', da)
      return el
    }
    const n = name.toLowerCase()

    if (n === 'ellipse' || n === 'circle') return ap(mkEl('ellipse', { cx, cy, rx: w / 2, ry: h / 2 }))
    if (n === 'rhombus' || n === 'diamond') return ap(mkEl('polygon', { points: `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}` }))
    if (n === 'hexagon') {
      const r = w * .25
      return ap(mkEl('polygon', { points: `${x + r},${y} ${x + w - r},${y} ${x + w},${cy} ${x + w - r},${y + h} ${x + r},${y + h} ${x},${cy}` }))
    }
    if (n === 'triangle') {
      const dir = s.direction || 'south'
      let pts: string
      if (dir === 'east') pts = `${x},${y} ${x + w},${cy} ${x},${y + h}`
      else if (dir === 'west') pts = `${x + w},${y} ${x},${cy} ${x + w},${y + h}`
      else if (dir === 'north') pts = `${x},${y + h} ${x + w},${y + h} ${cx},${y}`
      else pts = `${x},${y} ${x + w},${y} ${cx},${y + h}`
      return ap(mkEl('polygon', { points: pts }))
    }
    if (n === 'parallelogram') {
      const sk = w * .2
      return ap(mkEl('polygon', { points: `${x + sk},${y} ${x + w},${y} ${x + w - sk},${y + h} ${x},${y + h}` }))
    }
    if (n === 'trapezoid') {
      const sk = w * .15
      return ap(mkEl('polygon', { points: `${x + sk},${y} ${x + w - sk},${y} ${x + w},${y + h} ${x},${y + h}` }))
    }
    if (n === 'step') {
      const nk = Math.min(w * .1, 12)
      return ap(mkEl('polygon', { points: `${x},${y} ${x + w - nk},${y} ${x + w},${cy} ${x + w - nk},${y + h} ${x},${y + h} ${x + nk},${cy}` }))
    }
    if (n === 'delay') {
      const r2 = h / 2
      return ap(mkEl('path', { d: `M ${x},${y} L ${x + w - r2},${y} A ${r2},${r2} 0 0,1 ${x + w - r2},${y + h} L ${x},${y + h} Z` }))
    }

    if (n === 'cylinder' || n === 'cylinder3' || n === 'database') {
      const ry2 = Math.min(h * .12, 10), rx2 = w / 2
      const grp = mkEl('g')
      const body = ap(mkEl('path', { d: `M ${x},${y + ry2} L ${x},${y + h - ry2} A ${rx2},${ry2} 0 0,0 ${x + w},${y + h - ry2} L ${x + w},${y + ry2} A ${rx2},${ry2} 0 0,1 ${x},${y + ry2} Z` }))
      const top = ap(mkEl('ellipse', { cx: x + rx2, cy: y + ry2, rx: rx2, ry: ry2 }))
      grp.appendChild(body); grp.appendChild(top); return grp
    }
    if (n === 'cloud') {
      const d = `M ${x + w * .3},${y + h} A ${w * .18},${h * .25} 0 0,1 ${x + w * .1},${y + h * .65} A ${w * .14},${h * .22} 0 0,1 ${x + w * .15},${y + h * .4} A ${w * .16},${h * .22} 0 0,1 ${x + w * .4},${y + h * .2} A ${w * .14},${h * .2} 0 0,1 ${x + w * .65},${y + h * .25} A ${w * .18},${h * .25} 0 0,1 ${x + w * .9},${y + h * .5} A ${w * .14},${h * .22} 0 0,1 ${x + w * .8},${y + h} Z`
      return ap(mkEl('path', { d }))
    }
    if (n === 'actor' || n === 'person') {
      const r = Math.min(w * .2, h * .18), bx = cx, hcy = y + r
      const grp = mkEl('g')
      grp.setAttribute('stroke', stroke); grp.setAttribute('fill', 'none'); grp.setAttribute('stroke-width', String(sw))
      grp.appendChild(mkEl('circle', { cx: bx, cy: hcy, r, fill, stroke, 'stroke-width': sw }))
      grp.appendChild(mkEl('line', { x1: bx, y1: hcy + r, x2: bx, y2: y + h * .65, stroke, 'stroke-width': sw }))
      grp.appendChild(mkEl('line', { x1: x, y1: y + h * .38, x2: x + w, y2: y + h * .38, stroke, 'stroke-width': sw }))
      grp.appendChild(mkEl('line', { x1: bx, y1: y + h * .65, x2: x, y2: y + h, stroke, 'stroke-width': sw }))
      grp.appendChild(mkEl('line', { x1: bx, y1: y + h * .65, x2: x + w, y2: y + h, stroke, 'stroke-width': sw }))
      return grp
    }
    if (n === 'note') {
      const cr = Math.min(w * .15, h * .15, 16)
      const grp = mkEl('g')
      grp.appendChild(ap(mkEl('path', { d: `M ${x},${y} L ${x + w - cr},${y} L ${x + w},${y + cr} L ${x + w},${y + h} L ${x},${y + h} Z` })))
      grp.appendChild(mkEl('path', { d: `M ${x + w - cr},${y} L ${x + w - cr},${y + cr} L ${x + w},${y + cr}`, fill: 'none', stroke, strokeWidth: sw }))
      return grp
    }
    if (n === 'document') {
      const wv = h * .1
      return ap(mkEl('path', { d: `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h - wv} Q ${x + w * .75},${y + h - wv * 2} ${x + w / 2},${y + h - wv} Q ${x + w * .25},${y + h} ${x},${y + h - wv} Z` }))
    }
    if (n === 'swimlane') {
      const ss = +(s.startSize || 23)
      const grp = mkEl('g')
      const outer = ap(mkEl('rect', { x, y, width: w, height: h })); if (rx) outer.setAttribute('rx', String(rx))
      const hdr = mkEl('rect', { x, y, width: w, height: ss, fill, stroke: 'none' }); if (rx) hdr.setAttribute('rx', String(rx))
      const sep = mkEl('line', { x1: x, y1: y + ss, x2: x + w, y2: y + ss, stroke, 'stroke-width': sw })
      grp.appendChild(outer); grp.appendChild(hdr); grp.appendChild(sep)
      return grp
    }

    if (n.startsWith('mxgraph.') || n === 'image') {
      const el = ap(mkEl('rect', { x, y, width: w, height: h })); if (rx) el.setAttribute('rx', String(rx))
      if (n.startsWith('mxgraph.')) {
        const hint = mkEl('text', { x: x + w - 4, y: y + h - 3, 'text-anchor': 'end', fill: '#bbb', 'font-size': 7, 'pointer-events': 'none' })
        hint.textContent = n.split('.').pop() || ''
        const grp = mkEl('g'); grp.appendChild(el); grp.appendChild(hint); return grp
      }
      return el
    }

    // Default: rectangle
    const el = ap(mkEl('rect', { x, y, width: w, height: h }))
    if (rx) el.setAttribute('rx', String(rx))
    return el
  }

  private _label(text: string, geo: CellGeo, s: Record<string, string>, shapeName: string): SVGElement | null {
    if (!text) return null
    const fs = +(s.fontSize || 11)
    const fc = this._color(s.fontColor, '#000000')
    const fi = parseInt(s.fontStyle || '0')
    const bold = fi & 1 ? 'bold' : 'normal'
    const ital = fi & 2 ? 'italic' : 'normal'
    const uline = fi & 4 ? 'underline' : 'none'
    const align = s.align || 'center', valign = s.verticalAlign || 'middle'
    const spc = +(s.spacing || 2)
    const spT = +(s.spacingTop || spc), spB = +(s.spacingBottom || spc)
    const spL = +(s.spacingLeft || spc), spR = +(s.spacingRight || spc)

    let lg = { ...geo }
    if (shapeName === 'swimlane') { lg = { x: geo.x, y: geo.y, w: geo.w, h: +(s.startSize || 23), rel: false, pts: [] } }

    const lines = text.split('\n')
    const lh = fs * 1.35, th = lines.length * lh
    const bx = align === 'left' ? lg.x + spL + 2 : align === 'right' ? lg.x + lg.w - spR - 2 : lg.x + lg.w / 2
    const by = valign === 'top' ? lg.y + spT + fs / 2 + 2 : valign === 'bottom' ? lg.y + lg.h - spB - th + lh / 2 : lg.y + lg.h / 2 - th / 2 + lh / 2

    const t = mkEl('text', {
      'text-anchor': align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle',
      fill: fc, 'font-size': fs, 'font-weight': bold, 'font-style': ital,
      'text-decoration': uline, 'pointer-events': 'none',
    })
    lines.forEach((ln, i) => {
      const ts = mkEl('tspan', { x: bx, y: by + i * lh })
      ts.textContent = ln || ' '
      t.appendChild(ts)
    })
    return t
  }

  private _edge(svg: SVGElement, edge: Cell) {
    const s = edge.style
    const src = edge.source ? this.cells[edge.source] : null
    const tgt = edge.target ? this.cells[edge.target] : null
    const stroke = this._color(s.strokeColor, '#555555')
    const sw = +(s.strokeWidth || 1)
    const dashed = s.dashed === '1', dotted = s.dashed === '2'
    const endArr = s.endArrow || 'classic', startArr = s.startArrow || 'none'
    const endFill = s.endFill !== '0', startFill = s.startFill !== '0'

    const emId = this._marker(endArr, stroke, endFill, false)
    const smId = this._marker(startArr, stroke, startFill, true)

    let d = ''
    const geo = edge.geo
    if (geo?.pts?.length && geo.pts.length > 0) {
      const pts = geo.pts
      const sp = src ? this._cp(this.absGeo(src), pts[0].x, pts[0].y, s, false) : pts[0]
      const ep = tgt ? this._cp(this.absGeo(tgt), pts[pts.length - 1].x, pts[pts.length - 1].y, s, true) : pts[pts.length - 1]
      const all = [sp, ...pts.slice(1, -1), ep].filter(Boolean) as { x: number; y: number }[]
      d = all.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    } else if (src?.geo && tgt?.geo) {
      const sg = this.absGeo(src), tg = this.absGeo(tgt)
      if (!sg || !tg) return
      const es = s.edgeStyle || ''
      if (es.toLowerCase().includes('orthogonal') || es.toLowerCase().includes('elbow') || es.toLowerCase().includes('segment')) {
        d = this._ortho(sg, tg, s)
      } else {
        const sp = this._cp(sg, tg.x + tg.w / 2, tg.y + tg.h / 2, s, false)
        const ep = this._cp(tg, sg.x + sg.w / 2, sg.y + sg.h / 2, s, true)
        d = `M ${sp.x} ${sp.y} L ${ep.x} ${ep.y}`
      }
    } else return

    const grp = mkEl('g')
    const path = mkEl('path', { d, fill: 'none', stroke, 'stroke-width': sw })
    if (dashed) path.setAttribute('stroke-dasharray', '8,4')
    if (dotted) path.setAttribute('stroke-dasharray', '2,4')
    if (emId && endArr !== 'none') path.setAttribute('marker-end', `url(#${emId})`)
    if (smId && startArr !== 'none') path.setAttribute('marker-start', `url(#${smId})`)
    grp.appendChild(path)

    if (edge.value && src?.geo && tgt?.geo) {
      const sg = this.absGeo(src), tg = this.absGeo(tgt)
      if (sg && tg) {
        const mx = (sg.x + sg.w / 2 + tg.x + tg.w / 2) / 2
        const my = (sg.y + sg.h / 2 + tg.y + tg.h / 2) / 2
        const fc2 = this._color(s.fontColor, '#333333'), fs2 = +(s.fontSize || 10)
        const bg = mkEl('rect', { x: mx - edge.value.length * 3.2, y: my - fs2 * .7 - 2, width: edge.value.length * 6.4 + 6, height: fs2 + 6, fill: '#fff', opacity: .85, rx: 3 })
        const lbl = mkEl('text', { x: mx, y: my + 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: fc2, 'font-size': fs2, 'pointer-events': 'none' })
        lbl.textContent = edge.value
        grp.appendChild(bg); grp.appendChild(lbl)
      }
    }
    svg.appendChild(grp)
  }

  private _cp(geo: CellGeo | null, tx: number, ty: number, s: Record<string, string>, isEntry: boolean): { x: number; y: number } {
    if (!geo) return { x: tx, y: ty }
    if (isEntry && s.entryX !== undefined) return { x: geo.x + geo.w * (+s.entryX) + (+(s.entryDx || 0)), y: geo.y + geo.h * (+s.entryY) + (+(s.entryDy || 0)) }
    if (!isEntry && s.exitX !== undefined) return { x: geo.x + geo.w * (+s.exitX) + (+(s.exitDx || 0)), y: geo.y + geo.h * (+s.exitY) + (+(s.exitDy || 0)) }
    const cx = geo.x + geo.w / 2, cy = geo.y + geo.h / 2
    const dx = tx - cx, dy = ty - cy
    if (!dx && !dy) return { x: cx, y: cy }
    const t = Math.min(geo.w / 2 / Math.abs(dx || 1e-9), geo.h / 2 / Math.abs(dy || 1e-9))
    return { x: cx + dx * t, y: cy + dy * t }
  }

  private _ortho(sg: CellGeo, tg: CellGeo, _s: Record<string, string>): string {
    const sx = sg.x + sg.w / 2, sy = sg.y + sg.h / 2
    const tx2 = tg.x + tg.w / 2, ty2 = tg.y + tg.h / 2
    const adx = Math.abs(tx2 - sx), ady = Math.abs(ty2 - sy)
    if (adx >= ady) {
      const ex = sx + (tx2 > sx ? sg.w / 2 : -sg.w / 2)
      const ex2 = tx2 + (tx2 > sx ? -tg.w / 2 : tg.w / 2)
      const mx = (ex + ex2) / 2
      if (Math.abs(sy - ty2) < 4) return `M ${ex} ${sy} L ${ex2} ${ty2}`
      return `M ${ex} ${sy} L ${mx} ${sy} L ${mx} ${ty2} L ${ex2} ${ty2}`
    } else {
      const ey = sy + (ty2 > sy ? sg.h / 2 : -sg.h / 2)
      const ey2 = ty2 + (ty2 > sy ? -tg.h / 2 : tg.h / 2)
      const my = (ey + ey2) / 2
      if (Math.abs(sx - tx2) < 4) return `M ${sx} ${ey} L ${tx2} ${ey2}`
      return `M ${sx} ${ey} L ${sx} ${my} L ${tx2} ${my} L ${tx2} ${ey2}`
    }
  }

  private _marker(type: string, color: string, filled: boolean, isStart: boolean): string | null {
    if (!type || type === 'none' || type === 'ERmandOne') return null
    const key = `mk_${type}_${color.replace('#', '')}_${filled ? 1 : 0}_${isStart ? 1 : 0}`
    if (this._markers.has(key)) return key
    this._markers.add(key)
    const m = mkEl('marker', { id: key, markerWidth: 10, markerHeight: 8, orient: 'auto', markerUnits: 'strokeWidth' })

    if (type === 'classic' || type === 'block') {
      if (!isStart) { m.setAttribute('refX', '9'); m.setAttribute('refY', '4'); m.appendChild(mkEl('polygon', { points: '0 0, 9 4, 0 8', fill: filled ? color : 'white', stroke: color, 'stroke-width': 1 })) }
      else          { m.setAttribute('refX', '0'); m.setAttribute('refY', '4'); m.appendChild(mkEl('polygon', { points: '9 0, 0 4, 9 8', fill: filled ? color : 'white', stroke: color, 'stroke-width': 1 })) }
    } else if (type === 'open' || type === 'openThin') {
      if (!isStart) { m.setAttribute('refX', '8'); m.setAttribute('refY', '4'); m.appendChild(mkEl('path', { d: 'M 1 1 L 8 4 L 1 7', fill: 'none', stroke: color, 'stroke-width': 1.5 })) }
      else          { m.setAttribute('refX', '1'); m.setAttribute('refY', '4'); m.appendChild(mkEl('path', { d: 'M 8 1 L 1 4 L 8 7', fill: 'none', stroke: color, 'stroke-width': 1.5 })) }
    } else if (type === 'diamond' || type === 'diamondThin') {
      m.setAttribute('markerWidth', '12')
      if (!isStart) { m.setAttribute('refX', '11'); m.setAttribute('refY', '4'); m.appendChild(mkEl('polygon', { points: '1 4, 6 1, 11 4, 6 7', fill: filled ? color : 'white', stroke: color })) }
      else          { m.setAttribute('refX', '1');  m.setAttribute('refY', '4'); m.appendChild(mkEl('polygon', { points: '11 4, 6 1, 1 4, 6 7', fill: filled ? color : 'white', stroke: color })) }
    } else if (type === 'oval') {
      if (!isStart) { m.setAttribute('refX', '8'); m.setAttribute('refY', '4'); m.appendChild(mkEl('ellipse', { cx: 5, cy: 4, rx: 4, ry: 3, fill: filled ? color : 'white', stroke: color })) }
    } else {
      if (!isStart) { m.setAttribute('refX', '9'); m.setAttribute('refY', '4'); m.appendChild(mkEl('polygon', { points: '0 0, 9 4, 0 8', fill: color })) }
    }
    this.defs!.appendChild(m)
    return key
  }

  static async fromString(raw: string): Promise<DrawioRenderer> {
    const cells = await DrawioParser.parse(raw)
    return new DrawioRenderer(cells)
  }
}
