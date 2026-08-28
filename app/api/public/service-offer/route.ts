import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '../../../../payload.config'
import { colombiaDepartments } from '../../../../lib/colombia-locations'
import { RequestBodyTooLargeError, checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, readJsonBody, readRequestBody, textWithin } from '../../../../lib/input-security'
import { optimizeImage } from '../../../../lib/image-processing'
import { createR2Key, deleteR2Object, isR2Enabled, putR2Object } from '../../../../lib/r2-storage'
import { normalizeServiceCoverage, serviceModes, servicePricingTypes, type ServiceCoverage } from '../../../../lib/service-options'
import { isValidWhatsAppNumber, whatsappCountryCodes } from '../../../../lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_BODY_BYTES = MAX_IMAGE_SIZE + 256 * 1024
const allowedModes = new Set<string>(serviceModes.map((option) => option.value))
const allowedPricing = new Set<string>(servicePricingTypes.map((option) => option.value))
const allowedCountryCodes = new Set<string>(whatsappCountryCodes.map((option) => option.value))

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}

function validCoverage(value: unknown): value is ServiceCoverage[] {
  const coverage = normalizeServiceCoverage(value)
  return coverage.length > 0 && coverage.length <= 30 && coverage.every((item) => {
    const department = colombiaDepartments.find((option) => option.code === item.departmentCode)
    return Boolean(department && normalized(department.name) === normalized(item.department) && department.municipalities.some((municipality) => normalized(municipality) === normalized(item.city)))
  })
}

function validEmail(value: string) {
  return !value || value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseCoverage(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

async function readServiceOfferRequest(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.toLowerCase().startsWith('multipart/form-data;')) {
    let rawBody: Uint8Array
    try {
      rawBody = await readRequestBody(request, MAX_BODY_BYTES)
    } catch (error) {
      throw error instanceof RequestBodyTooLargeError ? error : new Error('invalid-body')
    }

    let formData: FormData
    try {
      const formRequest = new Request(request.url, { method: 'POST', headers: { 'content-type': contentType }, body: Buffer.from(rawBody) })
      formData = await formRequest.formData()
    } catch {
      throw new Error('invalid-body')
    }

    const body: Record<string, unknown> = {}
    let image: File | null = null
    for (const [key, value] of formData.entries()) {
      if (key === 'image') {
        if (value instanceof File) image = value
        continue
      }
      if (typeof value === 'string') body[key] = value
    }
    return { body, image }
  }

  if (!contentType.toLowerCase().includes('application/json')) throw new Error('invalid-body')
  return { body: await readJsonBody<Record<string, unknown>>(request, MAX_BODY_BYTES), image: null }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Origen de solicitud no permitido.' }, { status: 403 })

  const rate = checkRateLimit(`service-offer:${getClientAddress(request)}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) return NextResponse.json({ error: 'Recibimos varios intentos. Intenta de nuevo más tarde.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } })

  let body: Record<string, unknown>
  let image: File | null
  try {
    const parsed = await readServiceOfferRequest(request)
    body = parsed.body
    image = parsed.image
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'La imagen o el formulario supera el límite permitido de 10 MB.' }, { status: 413 })
    return NextResponse.json({ error: 'El contenido enviado no es válido o supera el límite permitido.' }, { status: 400 })
  }
  if (!isPlainRecord(body)) return NextResponse.json({ error: 'El contenido enviado no es válido.' }, { status: 400 })

  const provider = textWithin(body.provider, 160, true) || ''
  const providerEmail = textWithin(body.providerEmail, 254) || ''
  const title = textWithin(body.title, 160, true) || ''
  const description = textWithin(body.description, 5000, true) || ''
  const vision = textWithin(body.vision, 160, true) || ''
  const category = textWithin(body.category, 120, true) || ''
  const location = textWithin(body.location, 160, true) || ''
  const availability = textWithin(body.availability, 160)
  const countryCode = textWithin(body.whatsappCountryCode, 8, true) || ''
  const whatsappNumber = textWithin(body.whatsappNumber, 20, true) || ''
  const serviceMode = textWithin(body.serviceMode, 40, true) || ''
  const pricingType = textWithin(body.pricingType, 40, true) || ''
  const coverage = normalizeServiceCoverage(parseCoverage(body.coverage))
  const errors: string[] = []

  if (!provider) errors.push('Escribe tu nombre completo.')
  if (!validEmail(providerEmail)) errors.push('Escribe un correo válido.')
  if (!title) errors.push('Escribe el nombre del servicio.')
  if (description.length < 20) errors.push('Describe con claridad qué servicio ofreces con al menos 20 caracteres.')
  if (vision.length < 4) errors.push('Escribe una visión PL de al menos 4 caracteres.')
  if (!category) errors.push('Indica el área o categoría del servicio.')
  if (!validCoverage(coverage)) errors.push('Selecciona al menos una ciudad o municipio válido.')
  if (!location) errors.push('Indica el barrio, zona o alcance del servicio.')
  if (!allowedModes.has(serviceMode)) errors.push('Selecciona una modalidad válida.')
  if (!allowedPricing.has(pricingType)) errors.push('Selecciona una tarifa válida.')
  if (!allowedCountryCodes.has(countryCode) || !whatsappNumber || !isValidWhatsAppNumber(countryCode, whatsappNumber)) errors.push('Escribe un número de WhatsApp válido junto con su indicativo.')
  if (!(body.privacyAccepted === true || body.privacyAccepted === 'true' || body.privacyAccepted === 'on')) errors.push('Debes aceptar el aviso de privacidad.')
  if (!(image instanceof File) || image.size === 0) errors.push('Adjunta una foto del servicio para que el equipo pueda revisarlo.')
  else if (image.size > MAX_IMAGE_SIZE) errors.push('La foto no puede superar los 10 MB.')
  if (errors.length) return NextResponse.json({ error: errors[0], fields: errors }, { status: 400 })
  if (!(image instanceof File)) return NextResponse.json({ error: 'Adjunta una foto del servicio.' }, { status: 400 })

  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, mode: 'unavailable', message: 'El directorio todavía no tiene habilitada la base de datos para recibir ofertas.' }, { status: 503 })
  if (!isR2Enabled()) return NextResponse.json({ error: 'El almacenamiento de imágenes no está disponible temporalmente. Intenta de nuevo más tarde.' }, { status: 503 })

  let payload: Awaited<ReturnType<typeof getPayload>> | null = null
  let mediaId = ''
  let imageKey = ''
  try {
    payload = await getPayload({ config })
    const firstCity = coverage[0].city
    let optimized
    try {
      optimized = await optimizeImage(Buffer.from(await image.arrayBuffer()), image.name)
    } catch {
      return NextResponse.json({ error: 'La foto no parece ser una imagen válida. Selecciona otra e inténtalo de nuevo.' }, { status: 400 })
    }
    imageKey = createR2Key(optimized.filename)
    await putR2Object(imageKey, optimized.buffer, optimized.mimeType)
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: `Foto del servicio: ${title}`,
        r2Key: imageKey,
        filename: optimized.filename,
        mimeType: optimized.mimeType,
        filesize: optimized.filesize,
        width: optimized.width,
        height: optimized.height,
        r2Filename: optimized.filename,
        r2MimeType: optimized.mimeType,
        r2Filesize: optimized.filesize,
        uploadedByName: 'Formulario público',
      } as never,
      overrideAccess: true,
    })
    mediaId = String(media.id)
    const doc = await payload.create({
      collection: 'services',
      data: {
        title,
        description,
        vision,
        type: 'ofrecido',
        category,
        provider,
        ...(providerEmail ? { providerEmail } : {}),
        image: mediaId,
        city: firstCity,
        coverage,
        serviceMode,
        location,
        ...(availability ? { availability } : {}),
        pricingType,
        featured: false,
        whatsappCountryCode: countryCode,
        whatsappNumber,
        status: 'borrador',
        publicVisible: false,
        submissionSource: 'public-offer',
        registeredBy: 'Formulario público',
      } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true, id: doc.id, message: 'Recibimos tu servicio. El equipo lo revisará antes de publicarlo.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (mediaId && payload) {
      await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true }).catch((cleanupError) => payload?.logger.error({ err: cleanupError, mediaId, msg: 'No fue posible limpiar la imagen de una oferta pública fallida.' }))
    } else if (imageKey) {
      await deleteR2Object(imageKey).catch((cleanupError) => console.error('[service-offer] No fue posible limpiar la imagen temporal.', cleanupError))
    }
    payload?.logger.error({ err: error, msg: 'Falló el registro de una oferta pública de servicio.' })
    return NextResponse.json({ error: 'No fue posible registrar el servicio. Intenta de nuevo.' }, { status: 500 })
  }
}
