import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { getTeamsIndex } from '@/lib/getTeamsIndex'
import { resolveTeam } from '@/lib/teams'
import { getCompetitionName } from '@/lib/getCompetitionName'

// Le navigateur et le CDN gardent la reponse : revenir sur une saison deja
// consultee devient instantane. Cinq minutes cote navigateur, dix cote CDN,
// pour des donnees que le cron LFFS ne met a jour qu'une fois par jour.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
}

async function getMatchesBySeason(seasonId: number) {
  const payload = await getPayloadClient()

  const season = await payload.findByID({
    collection: 'seasons',
    id: seasonId,
  })
  const teams = await getTeamsIndex(payload)

  const result = await payload.find({
    collection: 'matches',
    limit: 1000,
    sort: 'date',
    depth: 1,
    where: { season: { equals: seasonId } },
  })

  return result.docs.map((m) => {
    const home = resolveTeam(teams, m.home_team)
    const away = resolveTeam(teams, m.away_team)

    return {
      id: m.id,
      home_team: home.name,
      home_team_logo: home.logo,
      home_is_club: home.isClub,
      away_team: away.name,
      away_team_logo: away.logo,
      away_is_club: away.isClub,
      score_home: m.score_home,
      score_away: m.score_away,
      date: m.date ? m.date.split('T')[0] : null,
      time: m.time,
      venue_id: m.venue_id,
      venue_name: m.venue_name,
      serie_reference: m.serie_reference,
      competition_name: getCompetitionName(m.serie_reference, season),
      live_link: m.live_link,
      replay_link: m.replay_link,
    }
  })
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
      { tags: ['matches', 'teams'] },
    )
    const data = await getCached()

    return NextResponse.json({ data }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching matches by season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
