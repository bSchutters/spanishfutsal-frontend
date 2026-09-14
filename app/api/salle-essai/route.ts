import { NextRequest, NextResponse } from 'next/server'

import { extraireSalle, salleVersTexte } from '@/lib/getXbotgoLive'

export const dynamic = 'force-dynamic'

/**
 * Pose ou retire le cookie de salle d'essai, en developpement seulement.
 *
 * Eprouver le direct demande un direct, et il ne s'en presente pas sur commande.
 * Ce cookie fait jouer n'importe quelle salle en cours sur le site lui-meme,
 * bandeau et compteur compris, sans attendre une rencontre et sans ecrire dans
 * les parametres, qui sont partages avec la production.
 *
 *   /api/salle-essai?lien=<adresse de la salle>   pour la poser
 *   /api/salle-essai?lien=                        pour la retirer
 *
 * Un lien a ouvrir, plutot qu'une ligne a taper dans une console : c'est la
 * seule facon que ca se rate pas. Repond 404 en production, quoi qu'il arrive.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const donne = request.nextUrl.searchParams
  const brut = donne.get('lien') ?? donne.get('salle') ?? ''

  // La region compte autant que l'identifiant : une salle chinoise interrogee
  // en Europe reste introuvable. Elle voyage donc avec lui dans le cookie.
  const salle = /^\d+$/.test(brut)
    ? { id: brut, region: (donne.get('region') ?? 'EU').toUpperCase() }
    : extraireSalle(brut)

  const reponse = NextResponse.redirect(new URL('/', request.url))

  if (!salle) {
    reponse.cookies.delete('salle-essai')
    return reponse
  }

  reponse.cookies.set('salle-essai', salleVersTexte(salle), {
    path: '/',
    maxAge: 4 * 60 * 60,
    sameSite: 'lax',
  })

  return reponse
}
