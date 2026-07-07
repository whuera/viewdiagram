import { prisma } from '@/lib/db'
import Dashboard from '@/components/Dashboard'
import type { Diagram } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const rows = await prisma.diagram.findMany({ orderBy: { sortOrder: 'asc' } })
  const diagrams: Diagram[] = rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
  return <Dashboard initialDiagrams={diagrams} />
}
