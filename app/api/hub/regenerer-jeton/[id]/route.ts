import { NextRequest, NextResponse } from 'next/server'

import { estAdmin } from '@/hub/droits'
import { getPayloadClient } from '@/lib/payload'
import { genererJeton } from '@/payload/collections/hub/Feeds'

export const dynamic = 'force-dynamic'

/**
 * Regenere le jeton d un flux. L ancien lien cesse de repondre a l instant :
 * les personnes abonnees devront se reabonner avec le nouveau lien ou le
 * nouveau QR code. Administrateurs seulement.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: request.headers })
  if (!estAdmin(user)) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { id: segment } = await params
  const id = Number(segment)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  // Le champ refuse toute modification par l API avec des droits : ici, on
  // passe outre volontairement, c est le seul chemin prevu pour le changer.
  const token = genererJeton()
  await payload.update({ collection: 'feeds', id, data: { token }, depth: 0, overrideAccess: true })

  return NextResponse.json({ ok: true, token })
}
