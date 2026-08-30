import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { getTeamsIndex } from '@/lib/getTeamsIndex'
import { resolveTeam } from '@/lib/teams'

export const dynamic = 'force-static'
export const revalidate = false

// Le navigateur et le CDN gardent la reponse : revenir sur une saison deja
// consultee devient instantane. Cinq minutes cote navigateur, dix cote CDN,
// pour des donnees que le cron LFFS ne met a jour qu'une fois par jour.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
}

async function getRankings() {
  const payload = await getPayloadClient()

  const seasonsResult = await payload.find({
    collection: 'seasons',
    where: { active: { equals: true } },
    limit: 1,
  })
  const activeSeason = seasonsResult.docs[0]
  const teams = await getTeamsIndex(payload)

  const result = await payload.find({
    collection: 'rankings',
    limit: 1000,
    sort: 'position',
    ...(activeSeason && { where: { season: { equals: activeSeason.id } } }),
  })

  return result.docs.map((r) => {
    const team = resolveTeam(teams, r.team_name)

    return {
      id: r.id,
      team_name: team.name,
      team_logo: team.logo,
      is_club: team.isClub,
      position: r.position,
      played: r.played,
      points: r.points,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals_for: r.goals_for,
      goals_against: r.goals_against,
      goal_difference: r.goal_difference,
      result_sequence: r.result_sequence,
      positionChange: r.positionChange,
    }
  })
}

const getCachedRankings = unstable_cache(getRankings, ['rankings'], {
  tags: ['rankings', 'teams'],
})

export async function GET() {
  try {
    const data = await getCachedRankings()

    return NextResponse.json({ data }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
