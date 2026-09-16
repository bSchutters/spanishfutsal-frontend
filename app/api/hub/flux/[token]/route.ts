import { NextRequest, NextResponse } from 'next/server'

import { baseUrlHub } from '@/hub/flux/base-url'
import { chargerEvenementsDuFlux, chargerFluxParJeton, chargerReglagesIcal, plageDuFlux } from '@/hub/flux/donnees'
import { construireIcs } from '@/hub/flux/ical'
import { adresseIp, verifierLimite } from '@/hub/limiteur'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/** Cent vingt lectures par quart d heure et par adresse : un telephone en demande une toutes les quelques heures. */
const LIMITE_FLUX = { max: 120, fenetreMs: 15 * 60 * 1000 }

/** Le jeton arrive avec son suffixe .ics, qui n en fait pas partie. */
export function extraireJeton(segment: string): string {
  return decodeURIComponent(segment).replace(/\.ics$/i, '')
}

/**
 * Le flux iCal d un public. Le jeton est le seul secret : inconnu ou flux
 * inactif, la reponse est un 404 sans autre detail. Les applications
 * calendrier relisent l adresse regulierement, d ou le cache court.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: segment } = await params
  const token = extraireJeton(segment)

  const payload = await getPayloadClient()
  const limite = await verifierLimite(payload, `hub:flux:${await adresseIp()}`, LIMITE_FLUX)
  if (!limite.ok) {
    return new NextResponse('Trop de requetes', { status: 429, headers: { 'Retry-After': '900' } })
  }

  const flux = await chargerFluxParJeton(token)
  if (!flux) return new NextResponse('Introuvable', { status: 404 })

  const [plage, reglages] = await Promise.all([plageDuFlux(), chargerReglagesIcal()])
  const evenements = await chargerEvenementsDuFlux(flux.id, plage)
  const ics = construireIcs({ flux, evenements, reglages, baseUrl: baseUrlHub() })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="uda-${flux.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  })
}
