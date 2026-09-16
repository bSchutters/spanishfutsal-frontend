import { NextRequest, NextResponse } from 'next/server'

import { listerEvenements } from '@/hub/calendrier/donnees'
import { peutLire } from '@/hub/droits'
import { lireSession } from '@/hub/session'

export const dynamic = 'force-dynamic'

/**
 * Les evenements d'une plage, pour le calendrier. La session est exigee, et
 * les droits de la personne s'appliquent a la lecture : elle ne recoit que
 * les evenements de ses flux. La plage est bornee a trois mois, ce que la
 * vue mois demande au plus.
 */
export async function GET(request: NextRequest) {
  const session = await lireSession()
  if (!session || !peutLire(session.user, 'calendar')) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const debut = new Date(request.nextUrl.searchParams.get('debut') ?? '')
  const fin = new Date(request.nextUrl.searchParams.get('fin') ?? '')
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin <= debut) {
    return NextResponse.json({ error: 'Plage invalide' }, { status: 400 })
  }
  if (fin.getTime() - debut.getTime() > 100 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Plage trop large' }, { status: 400 })
  }

  const evenements = await listerEvenements(session.user, { debut, fin })
  return NextResponse.json(
    { evenements },
    { headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } }
  )
}
