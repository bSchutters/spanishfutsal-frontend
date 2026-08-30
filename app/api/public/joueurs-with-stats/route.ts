import { NextResponse } from 'next/server'
import { getPlayers } from '@/lib/getPlayers'

export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  try {
    const data = await getPlayers()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching players with stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
