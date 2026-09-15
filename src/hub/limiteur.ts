import { headers } from "next/headers";
import type { Payload } from "payload";

/**
 * Une limite de debit sans serveur dedie : le compteur vit dans le magasin
 * cle-valeur de Payload, donc en base, ce qui survit aux fonctions Vercel qui
 * s'eteignent entre deux requetes. Une fenetre fixe suffit ici : il s'agit de
 * ralentir quelqu'un qui essaie des mots de passe, pas de lisser un trafic.
 *
 * Deux requetes simultanees peuvent compter pour une. C'est accepte.
 */

type Compteur = { n: number; fin: number };

export type Limite = { max: number; fenetreMs: number };

export const LIMITE_CONNEXION: Limite = { max: 10, fenetreMs: 15 * 60 * 1000 };

export async function verifierLimite(
  payload: Payload,
  cle: string,
  { max, fenetreMs }: Limite,
): Promise<{ ok: boolean; restant: number }> {
  const maintenant = Date.now();
  const compteur = await payload.kv.get<Compteur>(cle);

  if (!compteur || compteur.fin <= maintenant) {
    await payload.kv.set(cle, { n: 1, fin: maintenant + fenetreMs });
    return { ok: true, restant: max - 1 };
  }

  if (compteur.n >= max) return { ok: false, restant: 0 };

  await payload.kv.set(cle, { n: compteur.n + 1, fin: compteur.fin });
  return { ok: true, restant: max - compteur.n - 1 };
}

/**
 * L'adresse du visiteur telle que Vercel la transmet. Derriere un autre
 * mandataire, la premiere adresse de la liste est celle du client.
 */
export async function adresseIp(): Promise<string> {
  const entetes = await headers();
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || entetes.get("x-real-ip") || "inconnue";
}
