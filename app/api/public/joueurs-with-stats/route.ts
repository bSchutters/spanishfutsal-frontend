import { NextResponse } from 'next/server'
import { getPlayers } from '@/lib/getPlayers'

export const dynamic = 'force-static'
export const revalidate = false

// Le navigateur et le CDN gardent la reponse : revenir sur une saison deja
// consultee devient instantane. Cinq minutes cote navigateur, dix cote CDN,
// pour des donnees que le cron LFFS ne met a jour qu'une fois par jour.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
}

export async function GET() {
  try {
    const data = await getPlayers()

    return NextResponse.json(data, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching players with stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
