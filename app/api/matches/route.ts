import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

// POST: Create match (used by migration + import)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doc = await payload.create({ collection: 'matches', data: body })
    return NextResponse.json({ doc })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'matches',
      limit: 1000,
      sort: 'date',
    })

    // Return in Strapi-compatible format: { data: [...] }
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

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
