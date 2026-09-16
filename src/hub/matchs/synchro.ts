import type { Payload, PayloadRequest } from "payload";

import type { Statut } from "@/hub/calendrier/schema";
import { idDe } from "@/hub/droits";
import { lexicalVersTexte, texteVersLexical } from "@/hub/texte";
import { getTeamsIndex } from "@/lib/getTeamsIndex";
import {
  construireChampsMatch,
  differences,
  heureRdvApresSynchro,
  heureRdvParDefaut,
  saisonDe,
  type ChampsMatch,
  type ContexteConstruction,
  type MatchLffs,
  type Salle,
} from "./construction";
import { planifierPosts, type ContextePosts, type ModelePost, type ModePlan, type PostExistant } from "./posts";
import { variablesDe } from "./variables";

/**
 * La synchronisation entre la collection Matchs, remplie par l'import LFFS,
 * et les evenements Match du calendrier, avec leurs posts. Une seule
 * fonction par match, appelee par les crochets de la collection a chaque
 * ecriture et par la reconciliation quotidienne : idempotente, elle n'ecrit
 * que ce qui change.
 *
 * Tout passe par l'API locale avec les droits systeme, et par `req` quand
 * un crochet en fournit un : l'evenement se cree alors dans la transaction
 * du match, sans quoi le lien vers un match pas encore valide serait refuse.
 */

export type ContexteSynchro = {
  construction: ContexteConstruction;
  posts: ContextePosts;
  typeMatchId: number | null;
  fluxTypeMatch: number[];
  modeles: ModelePost[];
  saisonActiveId: number | null;
};

export type ResultatSynchro = "ignore" | "cree" | "modifie" | "inchange";

type Req = Pick<PayloadRequest, "transactionID"> | undefined;

const ids = (relations: unknown): number[] =>
  Array.isArray(relations) ? relations.map((r) => Number(idDe(r as never))).filter((n) => !Number.isNaN(n)) : [];

const idOuNull = (relation: unknown): number | null => {
  if (relation === null || relation === undefined) return null;
  const id = Number(idDe(relation as never));
  return Number.isNaN(id) ? null : id;
};

const adresseDe = (salle: Record<string, unknown>): string => {
  const rue = [salle.street, salle.street2]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const ville = [salle.zip, salle.city]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return [rue, ville].filter(Boolean).join(", ");
};

/** Tout ce que la synchronisation lit une fois : reglages, equipes, salles, types, modeles. */
export async function chargerContexte(payload: Payload, req?: Req): Promise<ContexteSynchro> {
  const commun = { depth: 0 as const, req: req as PayloadRequest | undefined };
  const [reglages, equipes, club, salles, types, flux, modeles, saisons] = await Promise.all([
    payload.findGlobal({ slug: "hub-settings", ...commun }),
    getTeamsIndex(payload),
    payload.find({ collection: "teams", where: { is_club: { equals: true } }, limit: 1, ...commun }),
    payload.find({ collection: "venues", limit: 500, ...commun }),
    payload.find({ collection: "event-types", sort: "order", limit: 50, ...commun }),
    payload.find({ collection: "feeds", where: { slug: { equals: "social" } }, limit: 1, ...commun }),
    payload.find({ collection: "post-templates", where: { active: { equals: true } }, limit: 100, ...commun }),
    payload.find({ collection: "seasons", where: { active: { equals: true } }, limit: 1, ...commun }),
  ]);

  const sallesParId = new Map<number, Salle>();
  for (const salle of salles.docs as Array<Record<string, unknown>>) {
    if (typeof salle.lffs_id === "number") {
      sallesParId.set(salle.lffs_id, { nom: String(salle.short_name ?? ""), adresse: adresseDe(salle) });
    }
  }

  const typeMatch = types.docs.find((t) => t.category === "match");
  const typePost = types.docs.find((t) => t.category === "post");
  const nomClubEquipe = typeof club.docs[0]?.name === "string" ? club.docs[0].name.trim() : "";

  return {
    construction: {
      nomClub: nomClubEquipe || String(reglages.club_display_name ?? "UD Asturiana"),
      motifClub: String(reglages.club_match_pattern ?? ""),
      equipes,
      salles: sallesParId,
      dureeMatchMinutes: Number(reglages.match_duration_minutes ?? 75),
      delaiRdvMinutes: Number(reglages.match_meeting_offset_minutes ?? 45),
    },
    posts: {
      typePostId: typePost ? Number(typePost.id) : 0,
      fluxParDefautId: flux.docs[0] ? Number(flux.docs[0].id) : null,
    },
    typeMatchId: typeMatch ? Number(typeMatch.id) : null,
    fluxTypeMatch: typeMatch ? ids(typeMatch.default_feeds) : [],
    modeles: (modeles.docs as Array<Record<string, unknown>>).map((m) => ({
      id: Number(m.id),
      nom: String(m.name ?? ""),
      actif: Boolean(m.active),
      appliquerA: (m.apply_to as ModelePost["appliquerA"]) ?? "both",
      decalageJours: Number(m.day_offset ?? 0),
      modeHeure: (m.time_mode as ModelePost["modeHeure"]) ?? "fixed_time",
      heureFixe: typeof m.fixed_time === "string" ? m.fixed_time : null,
      decalageMinutes: typeof m.minute_offset === "number" ? m.minute_offset : null,
      titreModele: String(m.title_template ?? ""),
      legendeModele: typeof m.caption_template === "string" ? m.caption_template : null,
      instructions: m.instructions ?? null,
      reseauxIds: ids(m.networks),
      formatIds: ids(m.format),
      fluxIds: ids(m.feeds),
      responsablesIds: ids(m.responsibles),
    })),
    saisonActiveId: saisons.docs[0] ? Number(saisons.docs[0].id) : null,
  };
}

type DocEvenement = Record<string, unknown> & { id: number | string };

async function evenementParLffsId(payload: Payload, lffsId: number, req: Req): Promise<DocEvenement | null> {
  const { docs } = await payload.find({
    collection: "events",
    where: { lffs_id: { equals: lffsId } },
    limit: 1,
    depth: 0,
    req: req as PayloadRequest | undefined,
  });
  return (docs[0] as DocEvenement | undefined) ?? null;
}

async function postsDuMatch(payload: Payload, evenementId: number, req: Req): Promise<PostExistant[]> {
  const { docs } = await payload.find({
    collection: "events",
    where: { and: [{ linked_match: { equals: evenementId } }, { template: { exists: true } }] },
    limit: 100,
    depth: 0,
    req: req as PayloadRequest | undefined,
  });
  return (docs as DocEvenement[])
    .map((p) => ({
      id: Number(p.id),
      modeleId: idOuNull(p.template) ?? 0,
      debut: String(p.starts_at ?? ""),
      fin: typeof p.ends_at === "string" ? p.ends_at : null,
      statut: (p.status as Statut | null) ?? "to_create",
      annule: Boolean(p.cancelled),
      titre: String(p.title ?? ""),
      legende: String(p.caption ?? ""),
      description: p.description ?? null,
      dateModifieeManuellement: Boolean(p.date_edited_manually),
      legendeModifieeManuellement: Boolean(p.caption_edited_manually),
    }))
    .filter((p) => p.modeleId > 0);
}

/** Cree et modifie les posts d'un match selon le plan. Renvoie ce qui a ete ecrit. */
async function appliquerPlan(
  payload: Payload,
  evenement: DocEvenement,
  match: MatchLffs,
  champs: ChampsMatch,
  contexte: ContexteSynchro,
  mode: ModePlan,
  req: Req,
): Promise<{ crees: number; modifies: number }> {
  if (!contexte.posts.typePostId) return { crees: 0, modifies: 0 };
  const existants = await postsDuMatch(payload, Number(evenement.id), req);
  const variables = variablesDe(champs, {
    heureRdv: typeof evenement.meeting_at === "string" ? evenement.meeting_at : null,
    lienLive: match.live_link,
    lienReplay: match.replay_link,
  });
  const plan = planifierPosts({ modeles: contexte.modeles, existants, champs, variables, contexte: contexte.posts, mode });

  for (const { data } of plan.aCreer) {
    await payload.create({
      collection: "events",
      data: { ...data, linked_match: Number(evenement.id) },
      depth: 0,
      req: req as PayloadRequest | undefined,
    });
  }
  for (const { id, data } of plan.aModifier) {
    await payload.update({ collection: "events", id, data, depth: 0, req: req as PayloadRequest | undefined });
  }
  return { crees: plan.aCreer.length, modifies: plan.aModifier.length };
}

/**
 * Un match de la collection Matchs vers son evenement et ses posts. Ignore
 * les matchs sans date, sans identifiant LFFS, d'essai, ou d'une autre
 * saison que la saison active.
 */
export async function synchroniserMatch(
  payload: Payload,
  match: MatchLffs,
  contexte: ContexteSynchro,
  req?: Req,
): Promise<ResultatSynchro> {
  if (match.essai) return "ignore";
  if (contexte.saisonActiveId === null || saisonDe(match) !== contexte.saisonActiveId) return "ignore";
  if (!contexte.typeMatchId) return "ignore";
  const champs = construireChampsMatch(match, contexte.construction);
  if (!champs) return "ignore";

  const existant = await evenementParLffsId(payload, champs.lffs_id, req);
  const { description, ...synchronises } = champs;

  if (!existant) {
    const cree = (await payload.create({
      collection: "events",
      data: {
        ...synchronises,
        description: texteVersLexical(description),
        type: contexte.typeMatchId,
        feeds: contexte.fluxTypeMatch,
        primary_feed: contexte.fluxTypeMatch[0] ?? null,
        meeting_at: champs.all_day ? null : heureRdvParDefaut(champs.starts_at, contexte.construction.delaiRdvMinutes),
        source: "lffs",
        lffs_match: Number(match.id),
        cancelled: false,
      },
      depth: 0,
      req: req as PayloadRequest | undefined,
    })) as DocEvenement;
    await appliquerPlan(payload, cree, match, champs, contexte, "synchro", req);
    return "cree";
  }

  const data: Record<string, unknown> = differences(existant, champs);
  const ancienDebut = typeof existant.starts_at === "string" ? existant.starts_at : null;
  const ancienRdv = typeof existant.meeting_at === "string" ? existant.meeting_at : null;
  if ("starts_at" in data || "all_day" in data || (!ancienRdv && !champs.all_day)) {
    const rdv = heureRdvApresSynchro({
      ancienDebut,
      ancienRdv,
      nouveauDebut: champs.starts_at,
      journeeEntiere: champs.all_day,
      delaiMinutes: contexte.construction.delaiRdvMinutes,
    });
    if (rdv !== ancienRdv) data.meeting_at = rdv;
  }
  // Payload normalise le JSON Lexical qu'il stocke, et le texte relu separe
  // les paragraphes d'une ligne vide : la comparaison passe par le meme
  // aller-retour des deux cotes, sinon chaque passage reecrirait la description.
  const descriptionVoulue = texteVersLexical(description);
  if (lexicalVersTexte(existant.description) !== lexicalVersTexte(descriptionVoulue)) data.description = descriptionVoulue;
  // Un match supprime puis recree par l'import n'est pas une annulation :
  // l'evenement revient, et ses posts annules par la synchro avec lui.
  const revient = Boolean(existant.cancelled);
  if (revient) data.cancelled = false;
  if (idOuNull(existant.lffs_match) !== Number(match.id)) data.lffs_match = Number(match.id);
  if (existant.source !== "lffs") data.source = "lffs";

  let modifie = false;
  if (Object.keys(data).length > 0) {
    await payload.update({
      collection: "events",
      id: existant.id,
      data,
      depth: 0,
      req: req as PayloadRequest | undefined,
    });
    modifie = true;
  }

  if (revient) {
    for (const post of await postsDuMatch(payload, Number(existant.id), req)) {
      if (post.annule && post.statut === "cancelled") {
        await payload.update({
          collection: "events",
          id: post.id,
          data: { cancelled: false, status: "to_create" },
          depth: 0,
          req: req as PayloadRequest | undefined,
        });
        modifie = true;
      }
    }
  }

  const evenement = { ...existant, ...data } as DocEvenement;
  const posts = await appliquerPlan(payload, evenement, match, champs, contexte, "synchro", req);
  if (posts.crees + posts.modifies > 0) modifie = true;
  return modifie ? "modifie" : "inchange";
}

/**
 * Le match n'existe plus dans la collection Matchs : l'evenement est annule,
 * pas efface, et ses posts non publies avec lui.
 */
export async function annulerMatchSupprime(payload: Payload, lffsId: number, req?: Req): Promise<boolean> {
  const existant = await evenementParLffsId(payload, lffsId, req);
  if (!existant) return false;
  if (!existant.cancelled) {
    await payload.update({
      collection: "events",
      id: existant.id,
      data: { cancelled: true, lffs_match: null },
      depth: 0,
      req: req as PayloadRequest | undefined,
    });
  }
  for (const post of await postsDuMatch(payload, Number(existant.id), req)) {
    if (post.statut !== "published" && !(post.annule && post.statut === "cancelled")) {
      await payload.update({
        collection: "events",
        id: post.id,
        data: { cancelled: true, status: "cancelled" },
        depth: 0,
        req: req as PayloadRequest | undefined,
      });
    }
  }
  return true;
}

/**
 * La reconciliation quotidienne : chaque match date de la saison active est
 * resynchronise, et tout evenement LFFS dont le match a disparu est annule.
 * Rattrape un crochet manque, sans rien faire de plus si tout est a jour.
 */
export async function reconcilierMatchs(payload: Payload): Promise<{
  saisonActive: boolean;
  matchs: number;
  crees: number;
  modifies: number;
  ignores: number;
  annules: number;
}> {
  const contexte = await chargerContexte(payload);
  const bilan = { saisonActive: contexte.saisonActiveId !== null, matchs: 0, crees: 0, modifies: 0, ignores: 0, annules: 0 };
  if (contexte.saisonActiveId === null) return bilan;

  const { docs: matchs } = await payload.find({
    collection: "matches",
    where: { and: [{ season: { equals: contexte.saisonActiveId } }, { essai: { not_equals: true } }] },
    limit: 1000,
    depth: 0,
  });
  bilan.matchs = matchs.length;
  for (const match of matchs as unknown as MatchLffs[]) {
    const resultat = await synchroniserMatch(payload, match, contexte);
    if (resultat === "cree") bilan.crees++;
    else if (resultat === "modifie") bilan.modifies++;
    else if (resultat === "ignore") bilan.ignores++;
  }

  // Les evenements LFFS dont le match n'existe plus, toutes saisons confondues.
  const { docs: tousLesMatchs } = await payload.find({
    collection: "matches",
    limit: 5000,
    depth: 0,
    select: { lffs_id: true },
  });
  const connus = new Set(tousLesMatchs.map((m) => m.lffs_id).filter((id): id is number => typeof id === "number"));
  const { docs: evenements } = await payload.find({
    collection: "events",
    where: { and: [{ source: { equals: "lffs" } }, { cancelled: { not_equals: true } }, { lffs_id: { exists: true } }] },
    limit: 1000,
    depth: 0,
  });
  for (const evenement of evenements as DocEvenement[]) {
    const lffsId = typeof evenement.lffs_id === "number" ? evenement.lffs_id : null;
    if (lffsId !== null && !connus.has(lffsId) && (await annulerMatchSupprime(payload, lffsId))) bilan.annules++;
  }
  return bilan;
}

/**
 * Le bouton « Regenerer les posts » d'un match : cree les posts manquants
 * pour les modeles actifs, sans toucher aux existants ; avec l'option,
 * remet aussi a neuf les posts non publies.
 */
export async function regenererPosts(
  payload: Payload,
  evenementId: number,
  reinitialiser: boolean,
): Promise<{ ok: true; crees: number; modifies: number } | { ok: false; erreur: string }> {
  const { docs } = await payload.find({ collection: "events", where: { id: { equals: evenementId } }, limit: 1, depth: 0 });
  const evenement = docs[0] as DocEvenement | undefined;
  if (!evenement || evenement.source !== "lffs" || typeof evenement.lffs_id !== "number") {
    return { ok: false, erreur: "Seul un match synchronisé avec la LFFS a des posts à générer." };
  }
  if (evenement.cancelled) return { ok: false, erreur: "Ce match est annulé." };

  const { docs: matchs } = await payload.find({
    collection: "matches",
    where: { lffs_id: { equals: evenement.lffs_id } },
    limit: 1,
    depth: 0,
  });
  const match = matchs[0] as unknown as MatchLffs | undefined;
  if (!match) return { ok: false, erreur: "Le match n'existe plus dans la collection Matchs." };

  const contexte = await chargerContexte(payload);
  const champs = construireChampsMatch(match, contexte.construction);
  if (!champs) return { ok: false, erreur: "Ce match n'a pas de date." };

  const resultat = await appliquerPlan(payload, evenement, match, champs, contexte, reinitialiser ? "reinitialiser" : "completer", undefined);
  return { ok: true, ...resultat };
}
