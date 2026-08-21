import { NextResponse } from 'next/server'

import { getOverview } from '../../../../lib/public-api'
import { publicReadGuard } from '../../../../lib/public-endpoint'

export async function GET(request: Request) {
  const rateLimitResponse = publicReadGuard(request)
  if (rateLimitResponse) return rateLimitResponse
  return NextResponse.json(await getOverview(), { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
