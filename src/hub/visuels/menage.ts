import type { Payload } from "payload";

/**
 * Le menage des visuels : une fois un post publie depuis quinze jours, ses
 * fichiers vivent sur les reseaux, plus besoin de les garder sur le
 * stockage. Le post garde sa legende et son lien de publication.
 */

export const DELAI_MENAGE_JOURS = 15;

export type PostAvecVisuels = {
  id: number;
  statut: string | null;
  /** La date du post, en ISO : c'est elle qui compte, pas celle du depot. */
  debut: string;
  visuelIds: number[];
};

/**
 * Les visuels a effacer : ceux dont chaque post qui les porte est publie
 * depuis au moins `jours` jours. Un visuel encore attache a un post non
 * publie, ou publie trop recemment, reste.
 */
export function visuelsAEffacer(posts: PostAvecVisuels[], maintenant: Date, jours = DELAI_MENAGE_JOURS): number[] {
  const limite = maintenant.getTime() - jours * 24 * 60 * 60_000;
  const perime = (p: PostAvecVisuels) => p.statut === "published" && new Date(p.debut).getTime() <= limite;
  const porteurs = new Map<number, PostAvecVisuels[]>();
  for (const post of posts) {
    for (const id of post.visuelIds) porteurs.set(id, [...(porteurs.get(id) ?? []), post]);
  }
  return [...porteurs.entries()].filter(([, liste]) => liste.every(perime)).map(([id]) => id);
}

type Doc = Record<string, unknown> & { id: number | string };

const ids = (relations: unknown): number[] =>
  Array.isArray(relations)
    ? relations.map((r) => Number(typeof r === "object" && r ? (r as { id?: unknown }).id : r)).filter((n) => !Number.isNaN(n))
    : [];

/** Efface les visuels perimes. Renvoie combien l'ont ete. */
export async function nettoyerVisuels(payload: Payload, maintenant = new Date()): Promise<{ candidats: number; effaces: number }> {
  const limite = new Date(maintenant.getTime() - DELAI_MENAGE_JOURS * 24 * 60 * 60_000).toISOString();
  const { docs: perimes } = await payload.find({
    collection: "events",
    where: { and: [{ status: { equals: "published" } }, { starts_at: { less_than_equal: limite } }, { visuals: { exists: true } }] },
    limit: 500,
    depth: 0,
    select: { status: true, starts_at: true, visuals: true },
  });
  const candidats = new Set(perimes.flatMap((p) => ids((p as Doc).visuals)));
  if (candidats.size === 0) return { candidats: 0, effaces: 0 };

  // Tous les posts qui portent l'un de ces visuels, publies ou non : la regle se juge sur l'ensemble.
  const { docs: porteurs } = await payload.find({
    collection: "events",
    where: { visuals: { in: [...candidats] } },
    limit: 1000,
    depth: 0,
    select: { status: true, starts_at: true, visuals: true },
  });
  const aEffacer = visuelsAEffacer(
    porteurs.map((p) => ({
      id: Number(p.id),
      statut: (p as Doc).status as string | null,
      debut: String((p as Doc).starts_at ?? ""),
      visuelIds: ids((p as Doc).visuals).filter((id) => candidats.has(id)),
    })),
    maintenant,
  );

  let effaces = 0;
  for (const id of aEffacer) {
    try {
      await payload.delete({ collection: "hub-media", id, depth: 0 });
      effaces++;
    } catch (erreur) {
      payload.logger.error({ err: erreur, msg: `Hub : visuel ${id} non efface` });
    }
  }
  return { candidats: candidats.size, effaces };
}
