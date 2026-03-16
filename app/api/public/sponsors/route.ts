import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const revalidate = 60

export async function GET() {
  try {
    const payload = await getPayloadClient()

    const result = await payload.find({
      collection: 'sponsors',
      where: { active: { equals: true } },
      sort: 'order',
      limit: 100,
    })

    const data = result.docs.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      logo: s.logo && typeof s.logo === 'object' ? (s.logo as { url?: string }).url : null,
    }))

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
