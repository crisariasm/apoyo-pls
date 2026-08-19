import { NextResponse } from 'next/server'

import { getOverview } from '../../../../lib/public-api'
import { publicReadGuard } from '../../../../lib/public-endpoint'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const rateLimitResponse = publicReadGuard(request)
  if (rateLimitResponse) return rateLimitResponse
  const overview = await getOverview()
  return NextResponse.json({ docs: overview.needs, mode: overview.mode }, { headers: { 'Cache-Control': 'no-store' } })
}
