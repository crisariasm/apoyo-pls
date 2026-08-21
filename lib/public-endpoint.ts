import { NextResponse } from 'next/server'

import { checkRateLimit, getClientAddress } from './input-security'

const PUBLIC_READ_LIMIT = 120
const PUBLIC_READ_WINDOW_MS = 60 * 1000

export function publicReadGuard(request: Request) {
  const rate = checkRateLimit(`public-read:${getClientAddress(request)}`, PUBLIC_READ_LIMIT, PUBLIC_READ_WINDOW_MS)
  if (rate.allowed) return null

  return NextResponse.json(
    { error: 'Demasiadas consultas. Intenta de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
  )
}
