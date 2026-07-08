import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import Dashboard from '@/components/Dashboard'
import type { Diagram } from '@/lib/types'
import type { Role } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const hdrs = headers()
  const role = (hdrs.get('x-user-role') || 'viewer') as Role
  const username = hdrs.get('x-username') || 'invitado'

  const rows = await prisma.diagram.findMany({ orderBy: { sortOrder: 'asc' } })
  const diagrams: Diagram[] = rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
  return <Dashboard initialDiagrams={diagrams} role={role} username={username} />
}
