import { NextResponse } from 'next/server'

import { canAccessModule, getPortalModule } from '../../../../lib/staff-portal-config'
import { InvalidRequestBodyError, checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody, RequestBodyTooLargeError } from '../../../../lib/input-security'
import { getPortalOwnershipWhere, getStaffSession, ownsPortalRecord } from '../../../../lib/staff-portal-auth'
import { normalizePortalData, validatePortalData } from '../../../../lib/staff-portal-validation'
import { isUUID } from '../../../../lib/uuid'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ module: string }> }

async function getAuthorizedModule(context: RouteContext) {
  const [session, params] = await Promise.all([getStaffSession(), context.params])
  const moduleDefinition = getPortalModule(params.module)
  if (!session || !moduleDefinition || !canAccessModule(moduleDefinition, session.user.role)) return null
  return { ...session, module: moduleDefinition }
}

function cleanData(module: NonNullable<ReturnType<typeof getPortalModule>>, body: Record<string, unknown>) {
  const allowed = new Set(module.fields.map((field) => field.name))
  const rawData = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'id' && allowed.has(key)))
  return normalizePortalData(module, rawData)
}

const DEFAULT_PAGE_SIZE = 8
const MAX_PAGE_SIZE = 20
const MAX_PORTAL_JSON_BYTES = 512 * 1024
const WRITE_RATE_LIMIT = 80
const WRITE_RATE_WINDOW_MS = 15 * 60 * 1000

function bodyError(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ message: error.message }, { status: 413 })
  if (error instanceof InvalidRequestBodyError) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ message: 'No fue posible leer el contenido enviado.' }, { status: 400 })
}

function writeRateLimitResponse(request: Request, session: Awaited<ReturnType<typeof getStaffSession>>, module: NonNullable<ReturnType<typeof getPortalModule>>) {
  if (!session) return null

  const userLimit = checkRateLimit(`portal-write-user:${session.user.id}:${module.slug}`, WRITE_RATE_LIMIT, WRITE_RATE_WINDOW_MS)
  const ipLimit = checkRateLimit(`portal-write-ip:${getClientAddress(request)}:${module.slug}`, WRITE_RATE_LIMIT * 2, WRITE_RATE_WINDOW_MS)
  if (userLimit.allowed && ipLimit.allowed) return null

  const retryAfter = Math.max(userLimit.retryAfter, ipLimit.retryAfter)
  return NextResponse.json(
    { message: 'Se alcanzó el límite temporal de cambios. Intenta nuevamente más tarde.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export async function GET(request: Request, context: RouteContext) {
  const authorized = await getAuthorizedModule(context)
  if (!authorized) return NextResponse.json({ message: 'No tienes acceso a este módulo.' }, { status: 403 })
  const url = new URL(request.url)
  if (authorized.module.slug === 'administracion' && url.searchParams.get('summary') === 'pending') {
    try {
      const result = await authorized.payload.find({ collection: authorized.module.collection, where: { status: { equals: 'pendiente' } }, limit: 1, page: 1, sort: '-createdAt', overrideAccess: true, user: authorized.user })
      const latest = result.docs[0] as unknown as Record<string, unknown> | undefined
      const requestType = typeof latest?.requestType === 'string' ? latest.requestType : ''
      const inferredHelpType = typeof latest?.helpType === 'string'
        ? latest.helpType
        : ['oferta', 'transporte', 'voluntariado'].includes(requestType) ? 'ofrecer-ayuda' : 'necesitar-ayuda'
      return NextResponse.json({
        pending: result.totalDocs,
        latest: latest ? { id: latest.id, helpType: inferredHelpType, createdAt: latest.createdAt } : null,
      })
    } catch {
      return NextResponse.json({ message: 'No fue posible consultar las solicitudes pendientes.' }, { status: 500 })
    }
  }
  const page = Math.max(Number.parseInt(url.searchParams.get('page') || '1', 10) || 1, 1)
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
  try {
    const result = await authorized.payload.find({ collection: authorized.module.collection, depth: 1, ...(authorized.module.slug === 'administracion' ? { pagination: false } : { limit, page }), sort: '-updatedAt', where: getPortalOwnershipWhere(authorized.user, authorized.module.slug), overrideAccess: true, user: authorized.user })
    return NextResponse.json({ docs: result.docs, page: result.page, totalPages: result.totalPages, totalDocs: result.totalDocs, limit: result.limit })
  } catch {
    return NextResponse.json({ message: 'No fue posible cargar los registros de este módulo.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const authorized = await getAuthorizedModule(context)
  if (!authorized) return NextResponse.json({ message: 'No tienes acceso a este módulo.' }, { status: 403 })
  if (authorized.module.canCreate === false) return NextResponse.json({ message: 'Este módulo no recibe registros nuevos.' }, { status: 405 })
  const rateLimitResponse = writeRateLimitResponse(request, authorized, authorized.module)
  if (rateLimitResponse) return rateLimitResponse
  let body: Record<string, unknown>
  try {
    body = await readJsonBody<Record<string, unknown>>(request, MAX_PORTAL_JSON_BYTES)
    if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  } catch (error) {
    return bodyError(error)
  }
  const data = cleanData(authorized.module, body)
  const validationError = validatePortalData(authorized.module, data)
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 })
  try {
    const created = await authorized.payload.create({ collection: authorized.module.collection, data: data as never, overrideAccess: true, user: authorized.user })
    return NextResponse.json({ doc: created }, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'No fue posible crear el registro. Verifica los campos e inténtalo de nuevo.' }, { status: 400 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const authorized = await getAuthorizedModule(context)
  if (!authorized) return NextResponse.json({ message: 'No tienes acceso a este módulo.' }, { status: 403 })
  const rateLimitResponse = writeRateLimitResponse(request, authorized, authorized.module)
  if (rateLimitResponse) return rateLimitResponse
  let body: Record<string, unknown>
  try {
    body = await readJsonBody<Record<string, unknown>>(request, MAX_PORTAL_JSON_BYTES)
    if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  } catch (error) {
    return bodyError(error)
  }
  const id = typeof body.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ message: 'Falta el identificador del registro.' }, { status: 400 })
  if (!isUUID(id)) return NextResponse.json({ message: 'El identificador del registro no es válido.' }, { status: 400 })
  let existing: Record<string, unknown>
  try {
    existing = await authorized.payload.findByID({ collection: authorized.module.collection, id, depth: 0, overrideAccess: true, user: authorized.user }) as unknown as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'No se encontró el registro solicitado.' }, { status: 404 })
  }
  if (!ownsPortalRecord(authorized.user, existing, authorized.module.slug)) return NextResponse.json({ message: 'No tienes permiso para modificar este registro.' }, { status: 403 })
  const data = cleanData(authorized.module, body)
  const validationError = validatePortalData(authorized.module, data, { partial: true })
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 })
  if (authorized.module.slug === 'administracion' && existing.status !== 'pendiente' && data.status === 'pendiente') {
    return NextResponse.json({ message: 'Una solicitud gestionada no puede volver a estado pendiente.' }, { status: 400 })
  }
  try {
    const updated = await authorized.payload.update({ collection: authorized.module.collection, id, data: data as never, overrideAccess: true, user: authorized.user })
    return NextResponse.json({ doc: updated })
  } catch {
    return NextResponse.json({ message: 'No fue posible actualizar el registro. Verifica los campos e inténtalo de nuevo.' }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origen de solicitud no permitido.' }, { status: 403 })
  const authorized = await getAuthorizedModule(context)
  if (!authorized) return NextResponse.json({ message: 'No tienes acceso a este módulo.' }, { status: 403 })
  if (authorized.module.canDelete === false) return NextResponse.json({ message: 'Este módulo no permite eliminar registros.' }, { status: 405 })
  const rateLimitResponse = writeRateLimitResponse(request, authorized, authorized.module)
  if (rateLimitResponse) return rateLimitResponse
  let body: { id?: string }
  try {
    body = await readJsonBody<{ id?: string }>(request, 16 * 1024)
    if (!isPlainRecord(body)) return NextResponse.json({ message: 'El contenido enviado no es válido.' }, { status: 400 })
  } catch (error) {
    return bodyError(error)
  }
  if (!body.id) return NextResponse.json({ message: 'Falta el identificador del registro.' }, { status: 400 })
  if (!isUUID(body.id)) return NextResponse.json({ message: 'El identificador del registro no es válido.' }, { status: 400 })
  let existing: Record<string, unknown>
  try {
    existing = await authorized.payload.findByID({ collection: authorized.module.collection, id: body.id, depth: 0, overrideAccess: true, user: authorized.user }) as unknown as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'No se encontró el registro solicitado.' }, { status: 404 })
  }
  if (!ownsPortalRecord(authorized.user, existing, authorized.module.slug)) return NextResponse.json({ message: 'No tienes permiso para eliminar este registro.' }, { status: 403 })
  try {
    await authorized.payload.delete({ collection: authorized.module.collection, id: body.id, overrideAccess: true, user: authorized.user })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: 'No fue posible eliminar el registro. Inténtalo de nuevo.' }, { status: 400 })
  }
}
