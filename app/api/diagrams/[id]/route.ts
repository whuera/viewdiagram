import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
  try {
    await prisma.diagram.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
