import type { Payload, Where } from "payload";

import { versChampDate } from "@/hub/dates";
import { getPayloadClient } from "@/lib/payload";
import { genererJeton } from "@/payload/collections/hub/Feeds";
import { articleDe, commandeDe } from "./conversions";
import type { Article, Commande, ReglagesPack, StatutCommande } from "./schema";

/**
 * La lecture des donnees du Pack, en systeme : chaque page qui s'en sert a
 * deja verifie le droit sur le module, ou, pour la page des joueurs, le lien
 * et le mot de passe. Un composant client n'importe jamais ce fichier.
 */

type Doc = Record<string, unknown> & { id: number | string };

/** Le catalogue, les articles actifs d'abord, dans l'ordre choisi par le club. */
export async function listerArticles(options: { actifsSeulement: boolean }, payload?: Payload): Promise<Article[]> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({
    collection: "pack-articles",
    where: options.actifsSeulement ? { active: { equals: true } } : undefined,
    sort: "sort_order",
    limit: 300,
    depth: 1,
  });
  const articles = (docs as Doc[]).map(articleDe);
  return articles.sort(
    (a, b) => Number(b.actif) - Number(a.actif) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
  );
}

export async function chargerArticle(id: number, payload?: Payload): Promise<Article | null> {
  const client = payload ?? (await getPayloadClient());
  try {
    return articleDe((await client.findByID({ collection: "pack-articles", id, depth: 1 })) as Doc);
  } catch {
    return null;
  }
}

/**
 * Les reglages, avec un lien toujours pret : au premier passage, le jeton
 * n'existe pas encore et il est tire ici.
 */
export async function chargerReglagesPack(payload?: Payload): Promise<ReglagesPack> {
  const client = payload ?? (await getPayloadClient());
  let doc = (await client.findGlobal({ slug: "pack-settings", depth: 0 })) as Record<string, unknown>;
  if (typeof doc.token !== "string" || doc.token === "") {
    doc = (await client.updateGlobal({ slug: "pack-settings", data: { token: genererJeton() }, depth: 0 })) as Record<
      string,
      unknown
    >;
  }
  return {
    ouvert: doc.open === true,
    dateLimite: typeof doc.deadline === "string" ? versChampDate(doc.deadline) || null : null,
    jeton: String(doc.token ?? ""),
    motDePasse: typeof doc.password === "string" ? doc.password : "",
    flocage: {
      numero: typeof doc.flock_number_price === "number" ? doc.flock_number_price : 5,
      nom: typeof doc.flock_name_price === "number" ? doc.flock_name_price : 2.5,
    },
  };
}

/** Les commandes, les plus recentes en tete, filtrees par statut si on le demande. */
export async function listerCommandes(statut?: StatutCommande | null, payload?: Payload): Promise<Commande[]> {
  const client = payload ?? (await getPayloadClient());
  const where: Where | undefined = statut ? { status: { equals: statut } } : undefined;
  const { docs } = await client.find({ collection: "pack-orders", where, sort: "-createdAt", limit: 1000, depth: 1 });
  return (docs as Doc[]).map(commandeDe);
}

/** Les commandes demandees par identifiant, dans l'ordre de reception. */
export async function chargerCommandes(ids: readonly number[], payload?: Payload): Promise<Commande[]> {
  if (ids.length === 0) return [];
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({
    collection: "pack-orders",
    where: { id: { in: [...ids] } },
    sort: "createdAt",
    limit: ids.length,
    depth: 1,
  });
  return (docs as Doc[]).map(commandeDe);
}

export async function chargerCommande(id: number, payload?: Payload): Promise<Commande | null> {
  const [commande] = await chargerCommandes([id], payload);
  return commande ?? null;
}

export type PersonneEffectif = { id: number; nom: string };

/** L'effectif actif, staff compris, trie par nom de famille : la liste de la page des joueurs. */
export async function listerEffectifActif(payload?: Payload): Promise<PersonneEffectif[]> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({
    collection: "players",
    where: { actif: { not_equals: false } },
    limit: 500,
    depth: 0,
  });
  return (docs as Doc[])
    .map((d) => ({
      id: Number(d.id),
      prenom: String(d.prenom ?? "").trim(),
      nom: String(d.nom ?? "").trim(),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
    .map((p) => ({ id: p.id, nom: [p.prenom, p.nom].filter(Boolean).join(" ") }));
}
