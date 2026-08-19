import { NextResponse } from 'next/server'
import { generateExpiredPayloadCookie, getPayload } from 'payload'

import config from '../../../../payload.config'
import { isSameOriginRequest } from '../../../../lib/input-security'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false }, { status: 403 })
  try {
    const payload = await getPayload({ config })
    const usersCollection = payload.config.collections.find((collection) => collection.slug === 'users')
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    if (usersCollection?.auth) {
      response.headers.set('Set-Cookie', generateExpiredPayloadCookie({
        collectionAuthConfig: usersCollection.auth,
        cookiePrefix: payload.config.cookiePrefix,
      }))
    }
    return response
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
