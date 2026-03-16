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
      collection: 'rankings',
      limit: 1000,
      sort: 'position',
      ...(activeSeason && { where: { season: { equals: activeSeason.id } } }),
    })

    const data = result.docs.map((r) => ({
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

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
