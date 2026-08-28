import { NextResponse } from 'next/server'

import { canAccessModule, getPortalModule } from '../../../../../lib/staff-portal-config'
import { checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody } from '../../../../../lib/input-security'
import { getStaffSession } from '../../../../../lib/staff-portal-auth'
import { isUUID } from '../../../../../lib/uuid'

export const dynamic = 'force-dynamic'

type ReviewBody = {
  action?: unknown
  id?: unknown
  featured?: unknown
  publicVisible?: unknown
  publishedAt?: unknown
}

function validPublishedAt(value: unknown) {
  if (typeof value !== 'string' || !value) return new Date()
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const session = await getStaffSession(request.headers)
  const servicesModule = getPortalModule('servicios')
  if (!session || !servicesModule || !canAccessModule(servicesModule, session.user.role)) return NextResponse.json({ message: 'No tienes acceso a revisar servicios.' }, { status: 403 })

  const userRate = checkRateLimit(`service-review-user:${session.user.id}`, 40, 15 * 60 * 1000)
  const ipRate = checkRateLimit(`service-review-ip:${getClientAddress(request)}`, 80, 15 * 60 * 1000)
  if (!userRate.allowed || !ipRate.allowed) return NextResponse.json({ message: 'Se alcanzó el límite temporal de cambios. Intenta más tarde.' }, { status: 429 })

  let body: ReviewBody
  try {
    body = await readJsonBody<ReviewBody>(request, 16 * 1024)
    if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  } catch {
    return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  }
  const id = typeof body.id === 'string' ? body.id : ''
  const action = body.action === 'approve' || body.action === 'delete' ? body.action : ''
  if (!isUUID(id) || !action) return NextResponse.json({ message: 'La acción o el servicio no son válidos.' }, { status: 400 })

  let existing: Record<string, unknown>
  try {
    existing = await session.payload.findByID({ collection: 'services', id, depth: 0, overrideAccess: true, user: session.user }) as unknown as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'No se encontró la solicitud de servicio.' }, { status: 404 })
  }
  if (existing.submissionSource !== 'public-offer' || existing.status !== 'borrador') return NextResponse.json({ message: 'Esta solicitud ya fue gestionada o no proviene del formulario público.' }, { status: 409 })

  if (action === 'delete') {
    try {
      await session.payload.delete({ collection: 'services', id, overrideAccess: true, user: session.user })
      return NextResponse.json({ ok: true, action })
    } catch {
      return NextResponse.json({ message: 'No fue posible eliminar la solicitud.' }, { status: 400 })
    }
  }

  const publishedAt = validPublishedAt(body.publishedAt)
  if (!publishedAt) return NextResponse.json({ message: 'Selecciona una fecha de publicación válida.' }, { status: 400 })
  if (typeof body.featured !== 'boolean' || typeof body.publicVisible !== 'boolean') return NextResponse.json({ message: 'Completa las opciones de publicación.' }, { status: 400 })

  try {
    const updated = await session.payload.update({
      collection: 'services',
      id,
      data: {
        status: 'publicado',
        publicVisible: body.publicVisible,
        featured: body.featured,
        publishedAt,
        approvedBy: session.user.name,
        approvedByUserId: session.user.id,
        approvedAt: new Date(),
      } as never,
      overrideAccess: true,
      user: session.user,
    })
    const updatedRecord = updated as unknown as Record<string, unknown>
    return NextResponse.json({ ok: true, action, doc: { id: updatedRecord.id, status: updatedRecord.status, publicVisible: updatedRecord.publicVisible, featured: updatedRecord.featured, publishedAt: updatedRecord.publishedAt, approvedBy: updatedRecord.approvedBy, approvedAt: updatedRecord.approvedAt } })
  } catch {
    return NextResponse.json({ message: 'No fue posible aprobar el servicio. Verifica la información e inténtalo de nuevo.' }, { status: 400 })
  }
}
