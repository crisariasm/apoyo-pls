import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { InvalidRequestBodyError, isPlainRecord, isSameOriginRequest, readJsonBody, RequestBodyTooLargeError, textWithin } from '../../../../lib/input-security'
import { optimizeImage } from '../../../../lib/image-processing'
import { getStaffSession } from '../../../../lib/staff-portal-auth'
import { createR2Key, deleteR2Object, isR2Enabled, putR2Object } from '../../../../lib/r2-storage'
import { isUUID } from '../../../../lib/uuid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_MULTIPART_SIZE = MAX_IMAGE_SIZE + 256 * 1024
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function canUploadForContext(role: string, context: string) {
  if (role === 'administracion') return context === 'comunicados' || context === 'evidencias'
  if (context === 'comunicados') return role === 'comunicados'
  if (context === 'evidencias') return role !== 'admin' && role !== 'super-admin'
  return false
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const session = await getStaffSession()
  if (!session) return NextResponse.json({ message: 'Necesitas iniciar sesión.' }, { status: 401 })
  if (!isR2Enabled()) return NextResponse.json({ message: 'R2 no está configurado para recibir imágenes.' }, { status: 503 })
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_SIZE) return NextResponse.json({ message: 'La carga supera el límite permitido.' }, { status: 413 })

  const formData = await request.formData()
  const file = formData.get('file')
  const rawAlt = formData.get('alt')
  const context = formData.get('context')
  const uploadContext = typeof context === 'string' ? context : ''
  if (!canUploadForContext(session.user.role, uploadContext)) return NextResponse.json({ message: 'No tienes permiso para cargar imágenes en este módulo.' }, { status: 403 })
  const alt = rawAlt ? textWithin(String(rawAlt), 160) : 'Imagen de PLs al llamado'
  if (!(file instanceof File)) return NextResponse.json({ message: 'Selecciona una imagen.' }, { status: 400 })
  if (!alt) return NextResponse.json({ message: 'El texto alternativo es demasiado largo.' }, { status: 400 })
  if (!allowedImageTypes.has(file.type.toLowerCase())) return NextResponse.json({ message: 'Solo se permiten imágenes JPG, PNG, WebP o GIF.' }, { status: 400 })
  if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ message: 'La imagen no puede superar los 10 MB.' }, { status: 400 })

  let key: string | null = null
  try {
    const optimized = await optimizeImage(Buffer.from(await file.arrayBuffer()), file.name)
    key = createR2Key(optimized.filename)
    await putR2Object(key, optimized.buffer, optimized.mimeType)
    const payload = await getPayload({ config })
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || 'Imagen de PLs al llamado',
        r2Key: key,
        filename: optimized.filename,
        mimeType: optimized.mimeType,
        filesize: optimized.filesize,
        width: optimized.width,
        height: optimized.height,
        r2Filename: optimized.filename,
        r2MimeType: optimized.mimeType,
        r2Filesize: optimized.filesize,
        uploadedByUserId: session.user.id,
        uploadedByName: session.user.name,
      } as never,
      overrideAccess: true,
      user: session.user,
    })
    return NextResponse.json({ doc: { id: media.id, url: `/api/media/${String(media.id)}`, filename: optimized.filename, mimeType: optimized.mimeType, filesize: optimized.filesize, width: optimized.width, height: optimized.height, alt: alt || 'Imagen de PLs al llamado' } }, { status: 201 })
  } catch {
    if (key) await deleteR2Object(key).catch(() => undefined)
    return NextResponse.json({ message: 'No fue posible cargar la imagen.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const session = await getStaffSession()
  if (!session) return NextResponse.json({ message: 'Necesitas iniciar sesión.' }, { status: 401 })
  let body: { id?: string }
  try {
    body = await readJsonBody<{ id?: string }>(request, 16 * 1024)
  } catch (error) {
    const message = error instanceof RequestBodyTooLargeError || error instanceof InvalidRequestBodyError ? error.message : 'El contenido enviado no es válido.'
    return NextResponse.json({ message }, { status: 400 })
  }
  if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  if (!body.id) return NextResponse.json({ message: 'Falta el identificador de la imagen.' }, { status: 400 })
  if (!isUUID(body.id)) return NextResponse.json({ message: 'El identificador de la imagen no es válido.' }, { status: 400 })

  try {
    const payload = await getPayload({ config })
    const media = await payload.findByID({ collection: 'media', id: body.id, overrideAccess: true, user: session.user }) as unknown as Record<string, unknown>
    const ownerId = typeof media.uploadedByUserId === 'string' ? media.uploadedByUserId : ''
    if (session.user.role !== 'administracion' && ownerId !== session.user.id) return NextResponse.json({ message: 'No tienes permiso para eliminar esta imagen.' }, { status: 403 })
    await payload.delete({ collection: 'media', id: body.id, overrideAccess: true, user: session.user })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: 'No fue posible eliminar la imagen.' }, { status: 500 })
  }
}
