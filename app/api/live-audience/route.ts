import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { enregistrerBattement } from '@/lib/audience'
import { dansLaFenetre } from '@/lib/fenetreDuMatch'
import { getMatchs } from '@/lib/getMatchs'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/**
 * Le signe de vie d'un spectateur.
 *
 * Publique par nature : elle est appelee par le lecteur de chaque visiteur,
 * toutes les quarante-cinq secondes, sans compte ni cookie. Elle n'accepte donc
 * qu'un identifiant de rencontre qui existe et dont la fenetre est ouverte,
 * faute de quoi elle deviendrait un moyen d'ecrire dans la base a volonte, tous
 * les jours de l'annee.
 */

/** Un identifiant tire au hasard par le navigateur, et rien d'autre. */
const VISITEUR_VALIDE = /^[a-z0-9]{8,64}$/

const PROVENANCES = ['direct', 'facebook', 'instagram', 'recherche', 'autre', 'interne']

/** Plafond des coupures declarees : au-dela, c'est une valeur fantaisiste. */
const COUPURES_MAX = 500

export async function POST(request: NextRequest) {
  try {
    const corps = await request.json()

    const matchId = Number(corps?.match)
    const visiteur = String(corps?.visiteur ?? '')

    // Tout le reste est facultatif et borne : cette route est publique, elle ne
    // fait confiance a rien de ce qu'on lui envoie.
    const largeur = Number(corps?.largeur)
    const coupures = Number(corps?.coupures)
    const source = String(corps?.source ?? 'direct')

    const mesures = {
      mobile: Boolean(corps?.mobile),
      son: Boolean(corps?.son),
      pleinEcran: Boolean(corps?.pleinEcran),
      largeur: Number.isFinite(largeur) && largeur > 0 && largeur < 10_000 ? Math.round(largeur) : null,
      source: PROVENANCES.includes(source) ? source : 'direct',
      coupures: Number.isFinite(coupures) ? Math.min(Math.max(0, Math.round(coupures)), COUPURES_MAX) : 0,
    }

    if (!Number.isInteger(matchId) || !VISITEUR_VALIDE.test(visiteur)) {
      return NextResponse.json({ error: 'Requete invalide' }, { status: 400 })
    }

    const match = (await getMatchs()).find((m) => m.id === matchId)
    if (!match) {
      return NextResponse.json({ error: 'Rencontre inconnue' }, { status: 404 })
    }

    if (!dansLaFenetre(match, Date.now()) && !(await horsFenetreAutorise())) {
      return NextResponse.json({ error: 'Hors fenetre' }, { status: 409 })
    }

    await enregistrerBattement(matchId, visiteur, mesures)

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Un battement perdu ne vaut pas une erreur visible : le spectateur regarde
    // son match, le compteur se rattrapera au suivant.
    console.error('Battement non enregistre :', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

/**
 * La case des parametres, lue seulement hors fenetre.
 *
 * Elle sert aux essais sur place, ou le comptage doit marcher comme un soir de
 * match. En fenetre, la question ne se pose pas : c'est ce qui evite une lecture
 * des parametres a chaque battement de chaque spectateur.
 */
async function horsFenetreAutorise(): Promise<boolean> {
  // La meme salle d'essai que la route du direct, en developpement seulement :
  // sans elle, le compteur resterait a zero pendant qu'on eprouve le lecteur.
  if (process.env.NODE_ENV !== 'production') {
    const essai = (await cookies()).get('salle-essai')?.value ?? ''
    if (/^\d+$/.test(essai)) return true
  }

  return verificationForcee()
}

async function verificationForcee(): Promise<boolean> {
  try {
    const payload = await getPayloadClient()
    const parametres = await payload.findGlobal({ slug: 'settings' })
    return Boolean(parametres?.force_live_check)
  } catch {
    return false
  }
}
