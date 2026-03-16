import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const revalidate = 60

export async function GET() {
  try {
    const payload = await getPayloadClient()

    // Get active season
    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const activeSeason = seasonsResult.docs[0]

    const result = await payload.find({
      collection: 'matches',
      limit: 1000,
      sort: 'date',
      ...(activeSeason && { where: { season: { equals: activeSeason.id } } }),
    })

    const data = result.docs.map((m) => ({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      score_home: m.score_home,
      score_away: m.score_away,
      date: m.date ? m.date.split('T')[0] : null,
      time: m.time,
      venue_id: m.venue_id,
      venue_name: m.venue_name,
      serie_reference: m.serie_reference,
      live_link: m.live_link,
      replay_link: m.replay_link,
    }))

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
