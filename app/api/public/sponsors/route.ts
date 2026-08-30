import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'
import { sponsorLinks } from '@/lib/getSponsors'

export const dynamic = 'force-static'
export const revalidate = false

// Le navigateur et le CDN gardent la reponse : revenir sur une saison deja
// consultee devient instantane. Cinq minutes cote navigateur, dix cote CDN,
// pour des donnees que le cron LFFS ne met a jour qu'une fois par jour.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
}

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

    return NextResponse.json({ data }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
