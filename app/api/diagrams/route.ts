import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

async function requireAdmin() {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  return payload?.role === 'admin' ? payload : null
}

export async function GET() {
  const diagrams = await prisma.diagram.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(diagrams)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { name, cat, description, svgCache, sourceXml, imageData, filePath } = body
  if (!name || !cat) {
    return NextResponse.json({ error: 'name and cat are required' }, { status: 400 })
  }
  const count = await prisma.diagram.count({ where: { isStatic: false } })
  const diagram = await prisma.diagram.create({
    data: {
      name,
      cat,
      description: description || '',
      svgCache: svgCache || null,
      sourceXml: sourceXml || null,
      imageData: imageData || null,
      filePath: filePath || null,
      isStatic: false,
      sortOrder: 1000 + count,
    },
  })
  return NextResponse.json(diagram, { status: 201 })
}
