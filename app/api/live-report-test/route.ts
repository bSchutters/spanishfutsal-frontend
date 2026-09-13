import { NextRequest, NextResponse } from 'next/server'

import { getPayloadClient } from '@/lib/payload'
import { envoyerUnRapportDEssai } from '@/lib/rapportDeDiffusion'

export const dynamic = 'force-dynamic'

/**
 * Envoie un rapport d'audience d'essai au webhook des parametres.
 *
 * Sert a verifier une adresse de webhook sans attendre une rencontre, le jour ou
 * on la change ou ou le salon Discord bouge. Les chiffres sont fabriques, rien
 * n'est lu ni ecrit dans les traces d'audience.
 *
 * Memes droits que les deux autres taches du site : le secret du cron, ou une
 * session d'administrateur.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const parLeSecret = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`

  if (!parLeSecret && !(await estAdministrateur(request))) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const resultat = await envoyerUnRapportDEssai()

  return NextResponse.json(resultat, { status: resultat.envoye ? 200 : 502 })
}

async function estAdministrateur(request: NextRequest): Promise<boolean> {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    return user?.role === 'admin'
  } catch {
    return false
  }
}
