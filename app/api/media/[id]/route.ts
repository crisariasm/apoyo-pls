import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { getR2Object, isR2Enabled } from '../../../../lib/r2-storage'
import { isUUID } from '../../../../lib/uuid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function safeContentType(value: unknown) {
  const candidate = String(value || '').split(';', 1)[0].trim().toLowerCase()
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(candidate) ? candidate : ''
}

export async function GET(_request: Request, context: RouteContext) {
  let decodedId = ''
  try {
    const { id } = await context.params
    decodedId = id ? decodeURIComponent(id).trim() : ''
  } catch {
    return NextResponse.json({ message: 'El identificador de la imagen no es válido.' }, { status: 400 })
  }

  if (!decodedId) return NextResponse.json({ message: 'Falta el identificador de la imagen.' }, { status: 400 })
  if (!isUUID(decodedId)) return NextResponse.json({ message: 'El identificador de la imagen no es válido.' }, { status: 400 })
  if (!isR2Enabled()) return NextResponse.json({ message: 'El almacenamiento de imágenes no está disponible.' }, { status: 503 })

  try {
    const payload = await getPayload({ config })
    const media = await payload.findByID({ collection: 'media', id: decodedId, overrideAccess: true }) as unknown as Record<string, unknown>
    const key = typeof media.r2Key === 'string' ? media.r2Key : ''
    if (!key) return NextResponse.json({ message: 'La imagen no está almacenada en R2.' }, { status: 404 })

    const file = await getR2Object(key)
    if (!file.ok || !file.body) return NextResponse.json({ message: 'No fue posible leer la imagen.' }, { status: file.status || 502 })
    const headers = new Headers()
    const contentType = safeContentType(media.r2MimeType) || safeContentType(file.headers.get('content-type')) || 'application/octet-stream'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('X-Content-Type-Options', 'nosniff')
    const contentLength = file.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)
    return new NextResponse(file.body, { status: 200, headers })
  } catch {
    return NextResponse.json({ message: 'No fue posible cargar la imagen.' }, { status: 404 })
  }
}
