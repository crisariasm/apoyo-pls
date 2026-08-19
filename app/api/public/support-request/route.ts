import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody, textWithin } from '../../../../lib/input-security'

export const dynamic = 'force-dynamic'

const supportRequestTypes = ['recursos', 'oferta', 'transporte', 'voluntariado'] as const
type SupportRequestType = (typeof supportRequestTypes)[number]
const helpTypes = ['necesitar-ayuda', 'ofrecer-ayuda'] as const
type HelpType = (typeof helpTypes)[number]
const MAX_SUPPORT_BODY_BYTES = 32 * 1024

function isSupportRequestType(value: unknown): value is SupportRequestType {
  return typeof value === 'string' && supportRequestTypes.includes(value as SupportRequestType)
}

function isHelpType(value: unknown): value is HelpType {
  return typeof value === 'string' && helpTypes.includes(value as HelpType)
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origen de solicitud no permitido.' }, { status: 403 })

  const rate = checkRateLimit(`support-request:${getClientAddress(request)}`, 10, 15 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } })

  let body: Record<string, unknown>
  try {
    body = await readJsonBody<Record<string, unknown>>(request, MAX_SUPPORT_BODY_BYTES)
  } catch {
    return NextResponse.json({ error: 'El contenido enviado no es válido o supera el límite permitido.' }, { status: 400 })
  }
  if (!isPlainRecord(body)) return NextResponse.json({ error: 'El contenido enviado no es válido.' }, { status: 400 })

  const requestType = typeof body.requestType === 'string' ? body.requestType : ''
  const helpType = typeof body.helpType === 'string' ? body.helpType : ''
  const category = textWithin(body.category, 120, true)
  const zone = textWithin(body.zone, 160, true)
  const quantity = textWithin(body.quantity, 80)
  const description = textWithin(body.description, 5000, true)
  const contactName = textWithin(body.contactName, 160, true)
  const contactChannel = textWithin(body.contactChannel, 200, true)
  if (!isHelpType(helpType) || !isSupportRequestType(requestType) || !category || !zone || !description || !contactName || !contactChannel || body.privacyAccepted !== true) {
    return NextResponse.json({ error: 'Completa los campos obligatorios y acepta el aviso de privacidad.' }, { status: 400 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, mode: 'unavailable', message: 'El centro todavía no tiene habilitada la base de datos para recibir solicitudes.' }, { status: 503 })
  }

  try {
    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'support-requests',
      data: {
        requestType,
        helpType,
        category,
        zone,
        ...(quantity ? { quantity } : {}),
        description,
        contactName,
        contactChannel,
        privacyAccepted: true,
      } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true, id: doc.id, message: 'Solicitud recibida correctamente.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'No fue posible registrar la solicitud. Intenta de nuevo.' }, { status: 500 })
  }
}
