import { notFound } from 'next/navigation'

import HlsPlayer from '@/components/live/hls-player'
import { extractRoomId, getXbotgoLive } from '@/lib/getXbotgoLive'

/**
 * BEQUILLE DE DEVELOPPEMENT, a retirer avant la fusion.
 *
 * Monte le lecteur sur une salle de diffusion donnee dans l'adresse, sans passer
 * par la fenetre du match ni par les parametres, qui sont partages avec la
 * production. Sert a eprouver le lecteur sur un vrai flux quand il s'en presente
 * un, ce qui n'arrive pas sur commande.
 *
 *   /essai-lecteur?salle=<identifiant>
 *
 * Repond 404 en production, quoi qu'il arrive.
 */
export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

export default async function EssaiLecteur({
  searchParams,
}: {
  searchParams: Promise<{ salle?: string; lien?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { salle, lien } = await searchParams
  const identifiant = salle ?? (lien ? extractRoomId(lien) : null)

  if (!identifiant) {
    return <p className="p-8">Passer ?salle=&lt;identifiant&gt; ou ?lien=&lt;adresse de la salle&gt;.</p>
  }

  const diffusion = await getXbotgoLive(identifiant)

  if (!diffusion) {
    return <p className="p-8">Aucune diffusion en cours dans la salle {identifiant}.</p>
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <p className="mb-3 text-sm">
        Salle {identifiant}, {diffusion.viewers ?? 0} spectateur(s) chez eux.
      </p>
      <HlsPlayer url={diffusion.hlsUrl} />
    </main>
  )
}
