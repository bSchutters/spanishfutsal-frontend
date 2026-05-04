import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

async function getRankingsBySeason(seasonId: number) {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'rankings',
    limit: 1000,
    sort: 'position',
    where: { season: { equals: seasonId } },
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
      () => getRankingsBySeason(id),
      ['rankings', seasonId],
      { tags: ['rankings'] },
    )
    const data = await getCached()

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching rankings by season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
