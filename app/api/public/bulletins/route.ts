import { NextResponse } from 'next/server'

import { getOverview } from '../../../../lib/public-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const overview = await getOverview()
  return NextResponse.json({ docs: overview.bulletins, mode: overview.mode }, { headers: { 'Cache-Control': 'no-store' } })
}
