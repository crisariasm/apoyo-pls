import { NextResponse } from 'next/server'
import { createLocalReq, generatePayloadCookie, getPayload, loginOperation } from 'payload'

import config from '../../../../payload.config'
import { checkRateLimit, getClientAddress, isPlainRecord, isSameOriginRequest, isValidEmail, readJsonBody } from '../../../../lib/input-security'
import { isDashboardRole } from '../../../../lib/staff-portal-auth'

export const dynamic = 'force-dynamic'
const MAX_LOGIN_JSON_BYTES = 16 * 1024
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function loginErrorResponse(status = 401, retryAfter?: number) {
  const response = NextResponse.json({ message: 'Credenciales inválidas.' }, { status, headers: { 'Cache-Control': 'no-store' } })
  if (retryAfter) response.headers.set('Retry-After', String(retryAfter))
  return response
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return loginErrorResponse(403)
    const address = getClientAddress(request)
    const body = await readJsonBody<{ email?: unknown; password?: unknown }>(request, MAX_LOGIN_JSON_BYTES)
    if (!isPlainRecord(body)) return loginErrorResponse()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password || !isValidEmail(email) || password.length > 256) return loginErrorResponse()

    const ipLimit = checkRateLimit(`portal-login-ip:${address}`, 12, LOGIN_WINDOW_MS)
    const accountLimit = checkRateLimit(`portal-login-account:${email}`, 8, LOGIN_WINDOW_MS)
    if (!ipLimit.allowed || !accountLimit.allowed) return loginErrorResponse(429, Math.max(ipLimit.retryAfter, accountLimit.retryAfter))

    const payload = await getPayload({ config })
    const usersCollection = payload.collections.users
    if (!usersCollection?.config.auth) return NextResponse.json({ message: 'No fue posible iniciar la sesión operativa.' }, { status: 500 })

    // Se invoca la operación de Payload directamente para conservar el token
    // únicamente dentro de la cookie HttpOnly. La configuración auth elimina
    // el token de las respuestas JSON, pero la operación local aún lo devuelve
    // para que podamos establecer la cookie de forma segura.
    const loginRequest = await createLocalReq({ req: { headers: new Headers(request.headers), url: request.url } }, payload)
    const result = await loginOperation({
      collection: usersCollection,
      data: { email, password },
      overrideAccess: true,
      req: loginRequest,
    })
    const role = result.user && typeof result.user === 'object' ? (result.user as { role?: unknown; active?: unknown }).role : null
    const active = result.user && typeof result.user === 'object' ? (result.user as { active?: unknown }).active !== false : false

    if (!isDashboardRole(role) || !active) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 })
    }

    if (!result.token) {
      return NextResponse.json({ message: 'No fue posible iniciar la sesión operativa.' }, { status: 500 })
    }

    const response = NextResponse.json({
      user: {
        name: typeof result.user?.name === 'string' ? result.user.name : 'Equipo operativo',
        email: result.user?.email,
        role,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
    response.headers.set('Set-Cookie', generatePayloadCookie({
      collectionAuthConfig: usersCollection.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token,
    }))
    return response
  } catch {
    return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 })
  }
}
