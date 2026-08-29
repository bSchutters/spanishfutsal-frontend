import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { sponsorLinks } from '@/lib/getSponsorsPage'

export const dynamic = 'force-static'
export const revalidate = false

async function getSponsors() {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'sponsors',
    where: { active: { equals: true } },
    sort: '_order',
    limit: 100,
  })

  return result.docs.map((s) => ({
    id: s.id,
    name: s.name,
    // Le bandeau du pied de page n'affiche qu'un lien : le site s'il existe,
    // sinon le premier reseau renseigne, pour que le logo reste cliquable.
    url: sponsorLinks(s.links)[0]?.url ?? null,
    logo: s.logo && typeof s.logo === 'object' ? (s.logo as { url?: string }).url : null,
  }))
}

const getCachedSponsors = unstable_cache(getSponsors, ['sponsors'], {
  tags: ['sponsors'],
})

export async function GET() {
  try {
    const data = await getCachedSponsors()

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
