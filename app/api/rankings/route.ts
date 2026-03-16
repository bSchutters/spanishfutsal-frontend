import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

// POST: Create ranking (used by migration + Payload admin)
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doc = await payload.create({ collection: 'rankings', data: body })
    return NextResponse.json({ doc })
  } catch (error) {
    console.error('Error creating ranking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'rankings',
      limit: 1000,
      sort: 'position',
    })

    // Return in Strapi-compatible format: { data: [...] }
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

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching rankings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
