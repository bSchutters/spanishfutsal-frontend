import type { Categorie } from "./donnees";

/**
 * La duree d'un evenement sans fin, selon sa categorie : un post tient une
 * demi-heure, un match et un entrainement la duree des reglages, le reste
 * une heure. Sert au calendrier du Hub et aux flux, pour que les deux
 * montrent la meme chose.
 */
export const DUREE_POST_MINUTES = 30;

export type DureesParDefaut = { dureeMatchMinutes: number; dureeEntrainementMinutes: number };

export function dureeParDefautMinutes(categorie: Categorie, durees: DureesParDefaut): number {
  if (categorie === "post") return DUREE_POST_MINUTES;
  if (categorie === "match") return durees.dureeMatchMinutes;
  if (categorie === "training") return durees.dureeEntrainementMinutes;
  return 60;
}

/** La fin d'un evenement : la sienne, sinon celle de sa categorie ; rien pour une journee entiere. */
export function finOuParDefaut(
  debut: Date,
  fin: Date | null,
  journeeEntiere: boolean,
  categorie: Categorie,
  durees: DureesParDefaut,
): Date | null {
  if (fin) return fin;
  if (journeeEntiere) return null;
  return new Date(debut.getTime() + dureeParDefautMinutes(categorie, durees) * 60_000);
}

export async function chargerDurees(payload: {
  findGlobal: (args: { slug: "hub-settings"; depth: 0 }) => Promise<Record<string, unknown>>;
}): Promise<DureesParDefaut> {
  const reglages = await payload.findGlobal({ slug: "hub-settings", depth: 0 });
  return {
    dureeMatchMinutes: Number(reglages?.match_duration_minutes ?? 75),
    dureeEntrainementMinutes: Number(reglages?.training_duration_minutes ?? 90),
  };
}
