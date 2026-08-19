import { NextResponse } from 'next/server'
import { createLocalReq, generatePayloadCookie, getPayload, refreshOperation } from 'payload'

import config from '../../../../payload.config'
import { checkRateLimit, getClientAddress, isSameOriginRequest } from '../../../../lib/input-security'
import { isDashboardRole } from '../../../../lib/staff-portal-auth'

export const dynamic = 'force-dynamic'

const REFRESH_RATE_LIMIT = 30
const REFRESH_RATE_WINDOW_MS = 15 * 60 * 1000

function sessionError(status = 401) {
  return NextResponse.json({ message: 'La sesión operativa no es válida.' }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return sessionError(403)

  const rate = checkRateLimit(`portal-refresh:${getClientAddress(request)}`, REFRESH_RATE_LIMIT, REFRESH_RATE_WINDOW_MS)
  if (!rate.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas renovaciones. Intenta nuevamente más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const payload = await getPayload({ config })
    const requestHeaders = new Headers(request.headers)
    const authResult = await payload.auth({ headers: requestHeaders })
    const user = authResult.user
    const role = user && typeof user === 'object' ? (user as { role?: unknown }).role : null
    const active = user && typeof user === 'object' ? (user as { active?: unknown }).active !== false : false
    if (!user || !isDashboardRole(role) || !active) return sessionError()

    const usersCollection = payload.collections.users
    if (!usersCollection?.config.auth) return sessionError(500)

    const refreshRequest = await createLocalReq({ req: { headers: requestHeaders, user, url: request.url } }, payload)
    const result = await refreshOperation({ collection: usersCollection, req: refreshRequest })
    const response = NextResponse.json({
      user: {
        name: typeof user.name === 'string' ? user.name : 'Equipo operativo',
        email: typeof user.email === 'string' ? user.email : '',
        role,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })

    response.headers.set('Set-Cookie', generatePayloadCookie({
      collectionAuthConfig: usersCollection.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.refreshedToken,
    }))
    return response
  } catch {
    return sessionError()
  }
}
