import { NextRequest, NextResponse } from 'next/server'

import {
  AFFICHE_ESSAI,
  COOKIE_ESSAI,
  essaiPermis,
  essaiVersTexte,
  matchDEssai,
  preparerLeMatchDEssai,
  type EssaiDuDirect,
} from '@/lib/essaiDuDirect'
import { extraireSalle } from '@/lib/getXbotgoLive'
import { cloturerLaDiffusion } from '@/lib/rapportDeDiffusion'

export const dynamic = 'force-dynamic'

/**
 * Eprouver le direct sans rencontre, en developpement seulement.
 *
 * Un direct ne se presente pas sur commande. Ces liens jouent une diffusion sur
 * le site entier, bandeau, lecteur, compteur, traces et rapport compris, sans
 * attendre un match et sans toucher aux parametres, partages avec la
 * production :
 *
 *   /api/salle-essai?flux=1                       le flux public d'essai
 *   /api/salle-essai?lien=<adresse de la salle>   une salle XbotGo en cours
 *   /api/salle-essai?fin=1                        fin de l'essai : le rapport
 *                                                 est ecrit, le cookie retire
 *   /api/salle-essai?lien=                        retirer le cookie sans rapport
 *
 * Le flux public suffit pour tout ce qui ne depend pas du bord du direct. Une
 * salle allumee, celle d'un autre club fait l'affaire, est le vrai chemin :
 * meme API, memes adresses signees, memes caprices du lecteur.
 *
 * Les traces et le rapport vont au match d'essai, cree ici s'il manque et date
 * de l'instant, que le site n'affiche jamais. Le rapport d'un essai reste dans
 * l'administration : rien ne part vers le webhook.
 *
 * Des liens a ouvrir, plutot que des lignes a taper dans une console : c'est la
 * seule facon que ca ne se rate pas. Repond 404 en production, quoi qu'il
 * arrive.
 */
export async function GET(request: NextRequest) {
  if (!essaiPermis()) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const donne = request.nextUrl.searchParams

  if (donne.has('fin')) {
    const match = await matchDEssai()
    if (match) {
      await cloturerLaDiffusion(match.id, AFFICHE_ESSAI, { recalculer: true })
    }

    // Droit sur la fiche qui vient d'etre ecrite.
    const reponse = NextResponse.redirect(new URL('/admin/collections/live-reports', request.url))
    reponse.cookies.delete(COOKIE_ESSAI)
    return reponse
  }

  const essai = lireLEssai(donne)
  const reponse = NextResponse.redirect(new URL('/', request.url))

  if (!essai) {
    reponse.cookies.delete(COOKIE_ESSAI)
    return reponse
  }

  await preparerLeMatchDEssai()

  reponse.cookies.set(COOKIE_ESSAI, essaiVersTexte(essai), {
    path: '/',
    maxAge: 4 * 60 * 60,
    sameSite: 'lax',
  })

  return reponse
}

function lireLEssai(donne: URLSearchParams): EssaiDuDirect | null {
  if (donne.has('flux')) return { type: 'flux' }

  const brut = donne.get('lien') ?? donne.get('salle') ?? ''

  // La region compte autant que l'identifiant : une salle chinoise interrogee
  // en Europe reste introuvable. Elle voyage donc avec lui dans le cookie.
  const salle = /^\d+$/.test(brut)
    ? { id: brut, region: (donne.get('region') ?? 'EU').toUpperCase() }
    : extraireSalle(brut)

  return salle ? { type: 'salle', salle } : null
}
