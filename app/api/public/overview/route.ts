import { NextResponse } from 'next/server'

import { getOverview } from '../../../../lib/public-api'

export async function GET() {
  return NextResponse.json(await getOverview(), { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
