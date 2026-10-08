import type { Payload, PayloadRequest, Where } from "payload";

import { versChampDate } from "@/hub/dates";
import { getPayloadClient } from "@/lib/payload";
import { genererJeton } from "@/payload/collections/hub/Feeds";
import { jetonInitial } from "./acces";
import { montantPourJoma, type CommandeJoma } from "./calculs";
import { articleDe, commandeDe, commandeJomaDe, wherePaiement } from "./conversions";
import type { Article, Commande, FiltrePaiement, ReglagesPack, StatutCommande } from "./schema";

/**
 * La lecture des donnees du Pack, en systeme : chaque page qui s'en sert a
 * deja verifie le droit sur le module, ou, pour la page des joueurs, le lien
 * et le mot de passe. Un composant client n'importe jamais ce fichier.
 */

type Doc = Record<string, unknown> & { id: number | string };

/** La remise generale du club, en pourcentage. */
async function remiseGenerale(client: Payload): Promise<number> {
  const doc = (await client.findGlobal({ slug: "pack-settings", depth: 0 })) as Record<string, unknown>;
  return typeof doc.discount === "number" ? doc.discount : 0;
}

/** Le catalogue, les articles actifs d'abord, dans l'ordre choisi par le club. */
export async function listerArticles(options: { actifsSeulement: boolean }, payload?: Payload): Promise<Article[]> {
  const client = payload ?? (await getPayloadClient());
  const [{ docs }, remise] = await Promise.all([
    client.find({
      collection: "pack-articles",
      where: options.actifsSeulement ? { active: { equals: true } } : undefined,
      sort: "sort_order",
      limit: 300,
      depth: 1,
    }),
    remiseGenerale(client),
  ]);
  const articles = (docs as Doc[]).map((doc) => articleDe(doc, remise));
  return articles.sort(
    (a, b) => Number(b.actif) - Number(a.actif) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
  );
}

export async function chargerArticle(id: number, payload?: Payload): Promise<Article | null> {
  const client = payload ?? (await getPayloadClient());
  try {
    const [doc, remise] = await Promise.all([client.findByID({ collection: "pack-articles", id, depth: 1 }), remiseGenerale(client)]);
    return articleDe(doc as Doc, remise);
  } catch {
    return null;
  }
}

/**
 * Les reglages, avec un lien toujours pret : au premier passage, le jeton
 * n'existe pas encore et il est pose ici.
 */
export async function chargerReglagesPack(payload?: Payload): Promise<ReglagesPack> {
  const client = payload ?? (await getPayloadClient());
  let doc = (await client.findGlobal({ slug: "pack-settings", depth: 0 })) as Record<string, unknown>;
  if (typeof doc.token !== "string" || doc.token === "") {
    // Le premier jeton vient du secret : deux premiers chargements simultanes ecrivent le meme.
    const secret = process.env.PAYLOAD_SECRET;
    const token = secret ? jetonInitial(secret) : genererJeton();
    doc = (await client.updateGlobal({ slug: "pack-settings", data: { token }, depth: 0 })) as Record<
      string,
      unknown
    >;
  }
  return {
    ouvert: doc.open === true,
    remise: typeof doc.discount === "number" ? doc.discount : 0,
    dateLimite: typeof doc.deadline === "string" ? versChampDate(doc.deadline) || null : null,
    jeton: String(doc.token ?? ""),
    motDePasse: typeof doc.password === "string" ? doc.password : "",
    flocage: {
      numero: typeof doc.flock_number_price === "number" ? doc.flock_number_price : 5,
      nom: typeof doc.flock_name_price === "number" ? doc.flock_name_price : 2.5,
    },
  };
}

/** Les commandes, les plus recentes en tete, filtrees par statut et par paiement si on le demande. */
export async function listerCommandes(
  statut?: StatutCommande | null,
  payload?: Payload,
  { paiement = null }: { paiement?: FiltrePaiement | null } = {},
): Promise<Commande[]> {
  const client = payload ?? (await getPayloadClient());
  const conditions = [statut ? { status: { equals: statut } } : null, wherePaiement(paiement)].filter((c): c is Where => c !== null);
  const where: Where | undefined = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : { and: conditions };
  const { docs } = await client.find({ collection: "pack-orders", where, sort: "-createdAt", limit: 1000, depth: 1 });
  return (docs as Doc[]).map(commandeDe);
}

/** Le nombre de commandes d'un statut, sans les charger. */
export async function compterCommandes(statut: StatutCommande, payload?: Payload): Promise<number> {
  const client = payload ?? (await getPayloadClient());
  const { totalDocs } = await client.count({ collection: "pack-orders", where: { status: { equals: statut } } });
  return totalDocs;
}

/** Le nombre de commandes a payer : ni payees, ni annulees. */
export async function compterAPayer(payload?: Payload): Promise<number> {
  const client = payload ?? (await getPayloadClient());
  const { totalDocs } = await client.count({ collection: "pack-orders", where: wherePaiement("a-payer") ?? undefined });
  return totalDocs;
}

/**
 * Ce qui reste a commander chez Joma, pour le minimum : les lignes des
 * commandes recues qu'aucune commande Joma n'a encore emportees. Les lignes
 * seules, sans joueurs ni catalogue.
 */
export async function montantACommander(payload?: Payload): Promise<number> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({
    collection: "pack-orders",
    where: { status: { equals: "received" } },
    select: { status: true, lines: true },
    pagination: false,
    depth: 0,
  });
  return montantPourJoma((docs as Doc[]).map(commandeDe), new Set());
}

/** Les commandes passees chez Joma, gardees telles quelles, la plus recente en tete. */
export async function listerCommandesJoma(payload?: Payload): Promise<CommandeJoma[]> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({ collection: "pack-joma-orders", sort: "-createdAt", limit: 200, depth: 0 });
  return (docs as Doc[]).map(commandeJomaDe);
}

export async function chargerCommandeJoma(id: number, payload?: Payload): Promise<CommandeJoma | null> {
  const client = payload ?? (await getPayloadClient());
  try {
    return commandeJomaDe((await client.findByID({ collection: "pack-joma-orders", id, depth: 0 })) as Doc);
  } catch {
    return null;
  }
}

/**
 * Les commandes demandees par identifiant, dans l'ordre de reception. Avec
 * `req`, lues dans la transaction qu'il porte.
 */
export async function chargerCommandes(ids: readonly number[], payload?: Payload, req?: PayloadRequest): Promise<Commande[]> {
  if (ids.length === 0) return [];
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({
    collection: "pack-orders",
    where: { id: { in: [...ids] } },
    sort: "createdAt",
    limit: ids.length,
    depth: 1,
    ...(req ? { req } : {}),
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
