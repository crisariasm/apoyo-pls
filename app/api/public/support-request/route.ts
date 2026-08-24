import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody, textWithin } from '../../../../lib/input-security'
import { isValidPhone, isValidQuantity, isValidQuantityUnit, normalizePhone, quantityValue } from '../../../../lib/public-request-validation'

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
  const source = body.source === 'need-offer' ? 'need-offer' : 'public-form'
  const category = textWithin(body.category, 120, true)
  const zone = textWithin(body.zone, 160, true)
  const quantityProvided = body.quantity !== undefined && body.quantity !== null && body.quantity !== ''
  const quantityUnit = textWithin(body.quantityUnit, 40)
  const description = textWithin(body.description, 5000, true)
  const contactName = textWithin(body.contactName, 160, true)
  const phone = textWithin(body.phone, 20, true)
  const errors: string[] = []
  if (!isHelpType(helpType)) errors.push('Selecciona un tipo de ayuda válido.')
  if (!isSupportRequestType(requestType)) errors.push('Selecciona un tipo de solicitud válido.')
  if (isHelpType(helpType) && isSupportRequestType(requestType)) {
    if (helpType === 'ofrecer-ayuda' && requestType === 'recursos') errors.push('El tipo de ayuda no coincide con la solicitud.')
    if (helpType === 'necesitar-ayuda' && ['oferta', 'voluntariado'].includes(requestType)) errors.push('El tipo de ayuda no coincide con la solicitud.')
  }
  if (!category) errors.push('Indica la categoría.')
  if (!zone) errors.push('Indica la zona o barrio.')
  if (!description) errors.push('Escribe el detalle de la solicitud.')
  if (!contactName) errors.push('Escribe el nombre de contacto.')
  if (!phone || !isValidPhone(phone)) errors.push('Escribe un número de teléfono válido.')
  if (quantityProvided && !isValidQuantity(body.quantity)) errors.push('La cantidad debe ser un número entero entre 1 y 1.000.000.000.')
  if (quantityProvided && !quantityUnit) errors.push('Selecciona la unidad de la cantidad.')
  if (!quantityProvided && quantityUnit) errors.push('Indica la cantidad antes de seleccionar una unidad.')
  if (quantityUnit && !isValidQuantityUnit(quantityUnit)) errors.push('Selecciona una unidad válida.')
  if (body.privacyAccepted !== true) errors.push('Debes aceptar el aviso de privacidad.')
  if (errors.length) return NextResponse.json({ error: errors[0], fields: errors }, { status: 400 })

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
        source,
        category,
        zone,
        ...(quantityProvided ? { quantity: quantityValue(body.quantity) } : {}),
        ...(quantityUnit ? { quantityUnit } : {}),
        description,
        contactName,
        phone: normalizePhone(phone || ''),
        privacyAccepted: true,
      } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true, id: doc.id, message: 'Solicitud recibida correctamente.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'No fue posible registrar la solicitud. Intenta de nuevo.' }, { status: 500 })
  }
}
