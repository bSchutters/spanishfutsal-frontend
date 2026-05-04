import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

async function getMatchesBySeason(seasonId: number) {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'matches',
    limit: 1000,
    sort: 'date',
    where: { season: { equals: seasonId } },
  })

  return result.docs.map((m) => ({
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
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seasonId: string }> },
) {
  try {
    const { seasonId } = await params
    const id = Number(seasonId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid season ID' }, { status: 400 })
    }

    const getCached = unstable_cache(
      () => getMatchesBySeason(id),
      ['matches', seasonId],
      { tags: ['matches'] },
    )
    const data = await getCached()

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching matches by season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
