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

export async function POST(request: NextRequest) {
  try {
    const corps = await request.json()

    const matchId = Number(corps?.match)
    const visiteur = String(corps?.visiteur ?? '')
    const mobile = Boolean(corps?.mobile)

    if (!Number.isInteger(matchId) || !VISITEUR_VALIDE.test(visiteur)) {
      return NextResponse.json({ error: 'Requete invalide' }, { status: 400 })
    }

    const match = (await getMatchs()).find((m) => m.id === matchId)
    if (!match) {
      return NextResponse.json({ error: 'Rencontre inconnue' }, { status: 404 })
    }

    if (!dansLaFenetre(match, Date.now()) && !(await verificationForcee())) {
      return NextResponse.json({ error: 'Hors fenetre' }, { status: 409 })
    }

    await enregistrerBattement(matchId, visiteur, mobile)

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
async function verificationForcee(): Promise<boolean> {
  try {
    const payload = await getPayloadClient()
    const parametres = await payload.findGlobal({ slug: 'settings' })
    return Boolean(parametres?.force_live_check)
  } catch {
    return false
  }
}
