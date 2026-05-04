import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-static'
export const revalidate = false

async function getRankings() {
  const payload = await getPayloadClient()

  const seasonsResult = await payload.find({
    collection: 'seasons',
    where: { active: { equals: true } },
    limit: 1,
  })
  const activeSeason = seasonsResult.docs[0]

  const result = await payload.find({
    collection: 'rankings',
    limit: 1000,
    sort: 'position',
    ...(activeSeason && { where: { season: { equals: activeSeason.id } } }),
  })

  return result.docs.map((r) => ({
    id: r.id,
    team_name: r.team_name,
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
  }))
}

const getCachedRankings = unstable_cache(getRankings, ['rankings'], {
  tags: ['rankings'],
})

export async function GET() {
  try {
    const data = await getCachedRankings()

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
