import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-static'
export const revalidate = false

async function getSeasons() {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'seasons',
    where: {
      or: [
        { active: { equals: true } },
        { archived: { equals: true } },
      ],
    },
    sort: '-start_date',
    limit: 100,
  })

  return result.docs.map((s) => {
    // Build label like "P4G (25-26)" from serie_name + name
    const shortName = s.name
      ? s.name.replace(/^20(\d{2})-20(\d{2})$/, '$1-$2')
      : s.name
    const label = s.serie_name
      ? `${s.serie_name} (${shortName})`
      : shortName || s.name

    return {
      id: s.id,
      name: s.name,
      label,
      active: s.active,
      archived: s.archived,
    }
  })
}

const getCachedSeasons = unstable_cache(getSeasons, ['seasons'], {
  tags: ['seasons'],
})

export async function GET() {
  try {
    const data = await getCachedSeasons()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching seasons:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
