const encoder = new TextEncoder()

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('El contenido enviado supera el límite permitido.')
    this.name = 'RequestBodyTooLargeError'
  }
}

export class InvalidRequestBodyError extends Error {
  constructor() {
    super('El contenido enviado no es válido.')
    this.name = 'InvalidRequestBodyError'
  }
}

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestBodyTooLargeError()

  const raw = await request.text()
  if (encoder.encode(raw).byteLength > maxBytes) throw new RequestBodyTooLargeError()

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new InvalidRequestBodyError()
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    const allowedOrigins = new Set([new URL(request.url).origin])
    const configuredOrigin = process.env.NEXT_PUBLIC_SERVER_URL
    if (configuredOrigin) allowedOrigins.add(new URL(configuredOrigin).origin)
    return allowedOrigins.has(origin)
  } catch {
    return false
  }
}

export function getClientAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = request.headers.get('x-real-ip')?.trim()
  const address = forwarded || real || 'unknown'
  return address.slice(0, 128)
}

type RateLimitEntry = { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    if (rateLimitStore.size > 2000) {
      for (const [entryKey, entry] of rateLimitStore) {
        if (entry.resetAt <= now) rateLimitStore.delete(entryKey)
      }
    }
    return { allowed: true, retryAfter: 0 }
  }

  current.count += 1
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export function textWithin(value: unknown, maxLength: number, required = false) {
  if (typeof value !== 'string') return required ? null : ''
  const clean = value.trim()
  if (!clean && required) return null
  return clean.length <= maxLength ? clean : null
}

export function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
