export type Cat = 'tx' | 'cl' | 'op' | 'hb'

export interface Diagram {
  id: string
  name: string
  cat: string
  description: string
  filePath: string | null
  svgCache: string | null
  sourceXml: string | null
  imageData: string | null
  isStatic: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const CATS: Record<string, { label: string; tag: string }> = {
  tx: { label: 'Arq. Transaccional',   tag: 'tag--tx' },
  cl: { label: 'Soluciones Cloud',      tag: 'tag--cl' },
  op: { label: 'Soluciones On-Premise', tag: 'tag--op' },
  hb: { label: 'Soluciones Híbridas',   tag: 'tag--hb' },
}
