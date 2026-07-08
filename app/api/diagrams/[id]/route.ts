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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { name, cat, description, svgCache, sourceXml, imageData, filePath } = body
  try {
    const diagram = await prisma.diagram.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(cat !== undefined && { cat }),
        ...(description !== undefined && { description }),
        ...(svgCache !== undefined && { svgCache }),
        ...(sourceXml !== undefined && { sourceXml }),
        ...(imageData !== undefined && { imageData }),
        ...(filePath !== undefined && { filePath }),
      },
    })
    return NextResponse.json(diagram)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    await prisma.diagram.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
