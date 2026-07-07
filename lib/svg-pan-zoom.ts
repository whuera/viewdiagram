'use client'

export class SvgPanZoom {
  private el: HTMLElement
  private svg: SVGElement
  private s = 1
  private tx = 0
  private ty = 0
  private drag = false
  private lx = 0
  private ly = 0
  private vp!: HTMLDivElement
  private _wh: (e: WheelEvent) => void
  private _pd: (e: PointerEvent) => void
  private _pm: (e: PointerEvent) => void
  private _pu: () => void

  constructor(container: HTMLElement, svgEl: SVGElement) {
    this.el = container
    this.svg = svgEl
    this._wh = this._onWheel.bind(this)
    this._pd = this._onPD.bind(this)
    this._pm = this._onPM.bind(this)
    this._pu = this._onPU.bind(this)
  }

  mount() {
    this.vp = document.createElement('div')
    this.vp.className = 'svg-viewport'
    this.vp.appendChild(this.svg)
    this.el.innerHTML = ''
    this.el.appendChild(this.vp)
    this.el.addEventListener('wheel', this._wh, { passive: false })
    this.el.addEventListener('pointerdown', this._pd)
    document.addEventListener('pointermove', this._pm)
    document.addEventListener('pointerup', this._pu)
    requestAnimationFrame(() => this.fit())
  }

  destroy() {
    this.el.removeEventListener('wheel', this._wh)
    this.el.removeEventListener('pointerdown', this._pd)
    document.removeEventListener('pointermove', this._pm)
    document.removeEventListener('pointerup', this._pu)
  }

  private _apply() {
    this.vp.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.s})`
  }

  fit() {
    const cr = this.el.getBoundingClientRect()
    const vb = (this.svg as SVGSVGElement).viewBox?.baseVal
    if (!vb || !cr.width) return
    const s = Math.min((cr.width - 48) / vb.width, (cr.height - 48) / vb.height, 1.5)
    this.s = s
    this.tx = (cr.width - vb.width * s) / 2
    this.ty = (cr.height - vb.height * s) / 2
    this._apply()
  }

  reset() { this.s = 1; this.tx = 0; this.ty = 0; this._apply() }

  zoomBy(f: number, mx?: number, my?: number) {
    const cr = this.el.getBoundingClientRect()
    const ox = mx !== undefined ? mx - cr.left : cr.width / 2
    const oy = my !== undefined ? my - cr.top : cr.height / 2
    this.tx = ox - (ox - this.tx) * f
    this.ty = oy - (oy - this.ty) * f
    this.s = Math.max(.05, Math.min(20, this.s * f))
    this._apply()
  }

  private _onWheel(e: WheelEvent) { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.12 : .88, e.clientX, e.clientY) }
  private _onPD(e: PointerEvent) { this.drag = true; this.el.classList.add('panning'); this.lx = e.clientX; this.ly = e.clientY; this.el.setPointerCapture(e.pointerId) }
  private _onPM(e: PointerEvent) { if (!this.drag) return; this.tx += e.clientX - this.lx; this.ty += e.clientY - this.ly; this.lx = e.clientX; this.ly = e.clientY; this._apply() }
  private _onPU() { this.drag = false; this.el.classList.remove('panning') }
}
