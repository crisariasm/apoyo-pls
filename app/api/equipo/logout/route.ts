import { NextResponse } from 'next/server'
import { createLocalReq, generateExpiredPayloadCookie, getPayload, logoutOperation } from 'payload'

import config from '../../../../payload.config'
import { isSameOriginRequest } from '../../../../lib/input-security'
import { isDashboardRole } from '../../../../lib/staff-portal-auth'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false }, { status: 403 })
  try {
    const payload = await getPayload({ config })
    const usersCollection = payload.collections.users
    if (usersCollection?.config.auth) {
      try {
        const requestHeaders = new Headers(request.headers)
        const authResult = await payload.auth({ headers: requestHeaders })
        const user = authResult.user
        const role = user && typeof user === 'object' ? (user as { role?: unknown }).role : null
        if (user && isDashboardRole(role)) {
          const logoutRequest = await createLocalReq({ req: { headers: requestHeaders, user, url: request.url } }, payload)
          await logoutOperation({ collection: usersCollection, req: logoutRequest })
        }
      } catch {
        // La cookie se revoca siempre aunque la sesión ya haya expirado.
      }
    }
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    if (usersCollection?.config.auth) {
      response.headers.set('Set-Cookie', generateExpiredPayloadCookie({
        collectionAuthConfig: usersCollection.config.auth,
        cookiePrefix: payload.config.cookiePrefix,
      }))
    }
    return response
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
