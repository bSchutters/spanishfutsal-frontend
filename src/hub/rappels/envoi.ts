import type { Payload } from "payload";
import webPush, { WebPushError, type PushSubscription } from "web-push";

import { occurrences, type Recurrence } from "@/hub/recurrence";
import {
  dansLaFenetre,
  destinataireDepuisUtilisateur,
  destinataires,
  fenetreDuJob,
  messageDe,
  rappelsDe,
  type DestinatairePotentiel,
  type EvenementARappeler,
  type Rappel,
  type ReglagesRappels,
} from "./regles";

/**
 * L'envoi des notifications push : la configuration VAPID, l'envoi a un
 * appareil avec retrait des abonnements morts, et le job des rappels qui
 * tourne toutes les cinq minutes derriere /api/hub/rappels.
 */

export type MessagePush = { title: string; body: string; url: string; tag?: string };

let configure = false;

/** Les cles VAPID, une fois. Sans elles, rien ne part et le job le dit. */
export function configurerWebPush(): boolean {
  const publique = process.env.VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;
  if (!configure) {
    webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@udasturiana.be", publique, privee);
    configure = true;
  }
  return true;
}

export function clePubliqueVapid(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

type Abonnement = { id: number | string; endpoint: string; keys: { p256dh: string; auth: string } };

/**
 * Envoie a un appareil. Un service push qui repond 404 ou 410 a oublie cet
 * appareil : l'abonnement est retire pour ne plus le tenter.
 */
export async function envoyerA(
  payload: Payload,
  abonnement: Abonnement,
  message: MessagePush,
): Promise<{ ok: true } | { ok: false; erreur: string; retire: boolean }> {
  if (!configurerWebPush()) return { ok: false, erreur: "Cles VAPID absentes", retire: false };
  const cible: PushSubscription = { endpoint: abonnement.endpoint, keys: abonnement.keys };
  try {
    await webPush.sendNotification(cible, JSON.stringify(message), { TTL: 60 * 60, urgency: "high" });
    await payload.update({
      collection: "push-subscriptions",
      id: abonnement.id,
      data: { last_success: new Date().toISOString() },
      depth: 0,
    });
    return { ok: true };
  } catch (erreur) {
    const statut = erreur instanceof WebPushError ? erreur.statusCode : 0;
    const mort = statut === 404 || statut === 410;
    if (mort) {
      await payload.delete({ collection: "push-subscriptions", id: abonnement.id, depth: 0 }).catch(() => undefined);
    }
    const texte = erreur instanceof Error ? erreur.message : String(erreur);
    return { ok: false, erreur: statut ? `${statut} ${texte}` : texte, retire: mort };
  }
}

/** Tous les appareils d'une personne. */
export async function abonnementsDe(payload: Payload, utilisateurId: number): Promise<Abonnement[]> {
  const { docs } = await payload.find({
    collection: "push-subscriptions",
    where: { user: { equals: utilisateurId } },
    limit: 50,
    depth: 0,
  });
  return docs.map((d) => ({
    id: d.id,
    endpoint: String(d.endpoint),
    keys: { p256dh: String((d.keys as { p256dh?: string })?.p256dh ?? ""), auth: String((d.keys as { auth?: string })?.auth ?? "") },
  }));
}

/** Envoie le meme message a tous les appareils d'une personne. */
export async function envoyerAPersonne(
  payload: Payload,
  utilisateurId: number,
  message: MessagePush,
): Promise<{ envoyes: number; echecs: string[] }> {
  const bilan = { envoyes: 0, echecs: [] as string[] };
  for (const abonnement of await abonnementsDe(payload, utilisateurId)) {
    const r = await envoyerA(payload, abonnement, message);
    if (r.ok) bilan.envoyes++;
    else bilan.echecs.push(r.erreur);
  }
  return bilan;
}

type DocEvenement = Record<string, unknown> & { id: number | string };

const noms = (relations: unknown): string[] =>
  Array.isArray(relations)
    ? relations.map((r) => (typeof r === "object" && r ? String((r as { name?: string }).name ?? "") : "")).filter(Boolean)
    : [];

const ids = (relations: unknown): number[] =>
  Array.isArray(relations)
    ? relations.map((r) => Number(typeof r === "object" && r ? (r as { id?: unknown }).id : r)).filter((n) => !Number.isNaN(n))
    : [];

function evenementDe(doc: DocEvenement): EvenementARappeler {
  const type = doc.type as { category?: string } | null;
  return {
    id: Number(doc.id),
    titre: String(doc.title ?? ""),
    categorie: ((typeof type === "object" && type ? type.category : "other") as EvenementARappeler["categorie"]) ?? "other",
    journeeEntiere: Boolean(doc.all_day),
    annule: Boolean(doc.cancelled),
    pasDeRappel: Boolean(doc.no_reminder),
    statut: (doc.status as string | null) ?? null,
    fluxIds: ids(doc.feeds),
    formats: noms(doc.format),
    reseaux: noms(doc.networks),
  };
}

async function chargerReglages(payload: Payload): Promise<ReglagesRappels> {
  const reglages = await payload.findGlobal({ slug: "hub-settings", depth: 0 });
  return {
    heureRappelMatin: String(reglages?.morning_reminder_time ?? "09:00"),
    delaiRappelAvantMinutes: Number(reglages?.reminder_before_minutes ?? 60),
  };
}

/** Les membres du Hub avec leur nombre d'appareils, pour choisir les destinataires. */
async function chargerPersonnes(payload: Payload): Promise<DestinatairePotentiel[]> {
  const [{ docs: utilisateurs }, { docs: abonnements }] = await Promise.all([
    payload.find({ collection: "users", limit: 200, depth: 0 }),
    payload.find({ collection: "push-subscriptions", limit: 1000, depth: 0, select: { user: true } }),
  ]);
  const compte = new Map<number, number>();
  for (const a of abonnements) {
    const id = Number(typeof a.user === "object" && a.user ? (a.user as { id?: unknown }).id : a.user);
    if (!Number.isNaN(id)) compte.set(id, (compte.get(id) ?? 0) + 1);
  }
  return utilisateurs.map((u) => destinataireDepuisUtilisateur(u as DocEvenement, compte.get(Number(u.id)) ?? 0));
}

/**
 * Reserve un rappel dans le journal. L'index unique fait qu'une seule
 * execution y parvient : la seconde recoit une erreur et n'envoie pas.
 */
async function reserver(payload: Payload, rappel: Rappel, utilisateurId: number): Promise<number | string | null> {
  try {
    const ligne = await payload.create({
      collection: "notification-log",
      data: {
        event: rappel.evenementId,
        occurrence: rappel.occurrence,
        reminder_type: rappel.type,
        user: utilisateurId,
        result: "en cours",
      },
      depth: 0,
    });
    return ligne.id;
  } catch {
    return null;
  }
}

export type BilanRappels = {
  fenetre: { de: string; a: string };
  evenements: number;
  rappels: number;
  envoyes: number;
  dejaFaits: number;
  echecs: number;
  sansCles: boolean;
};

/**
 * Le job : les rappels dont l'heure tombe dans les dix dernieres minutes,
 * occurrences des recurrences comprises, envoyes une seule fois chacun.
 */
export async function envoyerRappels(payload: Payload, maintenant = new Date()): Promise<BilanRappels> {
  const fenetre = fenetreDuJob(maintenant);
  const bilan: BilanRappels = {
    fenetre: { de: fenetre.de.toISOString(), a: fenetre.a.toISOString() },
    evenements: 0,
    rappels: 0,
    envoyes: 0,
    dejaFaits: 0,
    echecs: 0,
    sansCles: !configurerWebPush(),
  };
  if (bilan.sansCles) return bilan;

  const reglages = await chargerReglages(payload);
  // Un rappel du matin precede son evenement de moins d'une journee, un
  // rappel avant de quelques heures : les occurrences a chercher commencent
  // dans la fenetre et finissent un jour et demi plus tard.
  const plage = { debut: fenetre.de, fin: new Date(fenetre.a.getTime() + 36 * 60 * 60_000) };
  const { docs } = await payload.find({
    collection: "events",
    where: {
      and: [
        { cancelled: { not_equals: true } },
        { no_reminder: { not_equals: true } },
        {
          or: [
            { and: [{ starts_at: { greater_than_equal: plage.debut.toISOString() } }, { starts_at: { less_than_equal: plage.fin.toISOString() } }] },
            { "recurrence.frequency": { in: ["weekly", "monthly"] } },
          ],
        },
      ],
    },
    limit: 500,
    depth: 1,
  });
  bilan.evenements = docs.length;

  const dus: Array<{ rappel: Rappel; ev: EvenementARappeler; debut: Date }> = [];
  for (const brut of docs) {
    const doc = brut as DocEvenement;
    const ev = evenementDe(doc);
    for (const occ of occurrences(
      { starts_at: String(doc.starts_at), ends_at: doc.ends_at as string | null, recurrence: (doc.recurrence as Recurrence | null) ?? null },
      plage,
    )) {
      for (const rappel of dansLaFenetre(rappelsDe(ev, occ.debut, reglages), fenetre)) {
        dus.push({ rappel, ev, debut: occ.debut });
      }
    }
  }
  bilan.rappels = dus.length;
  if (dus.length === 0) return bilan;

  const personnes = await chargerPersonnes(payload);
  for (const { rappel, ev, debut } of dus) {
    const message = messageDe(ev, rappel.type, debut, reglages.delaiRappelAvantMinutes);
    for (const personne of destinataires(ev, personnes)) {
      const ligneId = await reserver(payload, rappel, personne.id);
      if (ligneId === null) {
        bilan.dejaFaits++;
        continue;
      }
      const r = await envoyerAPersonne(payload, personne.id, message);
      const resultat = r.envoyes > 0 ? `envoye a ${r.envoyes} appareil(s)` : `echec : ${r.echecs.join(" ; ") || "aucun appareil"}`;
      await payload
        .update({
          collection: "notification-log",
          id: ligneId,
          data: { sent_at: new Date().toISOString(), result: resultat.slice(0, 250) },
          depth: 0,
        })
        .catch(() => undefined);
      if (r.envoyes > 0) bilan.envoyes++;
      else bilan.echecs++;
    }
  }
  return bilan;
}
