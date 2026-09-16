import type { Payload } from "payload";

import { listerCommentaires, type Commentaire } from "@/hub/calendrier/donnees";
import { idDe } from "@/hub/droits";
import type { UtilisateurSession } from "@/hub/session";
import { lexicalVersTexte } from "@/hub/texte";
import { getPayloadClient } from "@/lib/payload";
import type { StatutIdee } from "./schema";

/**
 * La lecture des idees, toujours avec les droits de la personne. Une carte
 * porte ce que le tableau montre ; le detail y ajoute les commentaires.
 */

export type IdeeCarte = {
  id: number;
  titre: string;
  statut: StatutIdee;
  description: string;
  reseauxIds: number[];
  reseaux: string[];
  formatIds: number[];
  formats: string[];
  lienInspiration: string;
  matchLieId: number | null;
  matchLie: { id: number; titre: string } | null;
  postPlanifie: { id: number; titre: string } | null;
  auteurId: number | null;
  auteur: string;
  creeLe: string;
  votes: number;
  votantsIds: number[];
  aVote: boolean;
  nbCommentaires: number;
};

export type IdeeDetail = IdeeCarte & { commentaires: Commentaire[] };

/** Un match du calendrier auquel rattacher une idee. */
export type MatchChoix = { id: number; titre: string; debut: string };

type Doc = Record<string, unknown> & { id: number | string };

const ids = (relations: unknown): number[] =>
  Array.isArray(relations) ? relations.map((r) => Number(idDe(r as never))).filter((n) => !Number.isNaN(n)) : [];

const noms = (relations: unknown): string[] =>
  Array.isArray(relations)
    ? relations.map((r) => (typeof r === "object" && r ? String((r as { name?: string }).name ?? "") : "")).filter(Boolean)
    : [];

const nomPersonne = (u: unknown): string => {
  if (!u || typeof u !== "object") return "";
  const doc = u as { first_name?: string | null; last_name?: string | null; email?: string | null };
  return (
    [doc.first_name, doc.last_name]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(" ") ||
    doc.email?.split("@")[0] ||
    ""
  );
};

const evenementLie = (relation: unknown): { id: number; titre: string } | null => {
  if (!relation) return null;
  if (typeof relation === "object") {
    const doc = relation as { id?: unknown; title?: unknown };
    return { id: Number(doc.id), titre: String(doc.title ?? "") };
  }
  return { id: Number(relation), titre: "" };
};

function carteDe(doc: Doc, utilisateurId: number, nbCommentaires: number): IdeeCarte {
  const votants = ids(doc.votes);
  return {
    id: Number(doc.id),
    titre: String(doc.title ?? ""),
    statut: (doc.status as StatutIdee | undefined) ?? "new",
    description: lexicalVersTexte(doc.description),
    reseauxIds: ids(doc.networks),
    reseaux: noms(doc.networks),
    formatIds: ids(doc.format),
    formats: noms(doc.format),
    lienInspiration: String(doc.inspiration_link ?? ""),
    matchLieId: doc.linked_match ? Number(idDe(doc.linked_match as never)) : null,
    matchLie: evenementLie(doc.linked_match),
    postPlanifie: evenementLie(doc.planned_post),
    auteurId: doc.author ? Number(idDe(doc.author as never)) : null,
    auteur: nomPersonne(doc.author),
    creeLe: String(doc.createdAt ?? ""),
    votes: votants.length,
    votantsIds: votants,
    aVote: votants.includes(utilisateurId),
    nbCommentaires,
  };
}

/** Le nombre de commentaires par idee, en une requete. */
async function compterCommentaires(payload: Payload, user: UtilisateurSession, ideeIds: number[]): Promise<Map<number, number>> {
  const compte = new Map<number, number>();
  if (ideeIds.length === 0) return compte;
  const { docs } = await payload.find({
    collection: "comments",
    where: { and: [{ "target.relationTo": { equals: "ideas" } }, { "target.value": { in: ideeIds } }] },
    limit: 2000,
    depth: 0,
    select: { target: true },
    overrideAccess: false,
    user,
  });
  for (const c of docs) {
    const cible = (c as { target?: { value?: unknown } }).target?.value;
    const id = Number(typeof cible === "object" && cible ? (cible as { id?: unknown }).id : cible);
    if (!Number.isNaN(id)) compte.set(id, (compte.get(id) ?? 0) + 1);
  }
  return compte;
}

export async function listerIdees(user: UtilisateurSession): Promise<IdeeCarte[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "ideas",
    sort: "-createdAt",
    limit: 500,
    depth: 1,
    overrideAccess: false,
    user,
  });
  const commentaires = await compterCommentaires(
    payload,
    user,
    docs.map((d) => Number(d.id)),
  );
  return docs.map((d) => carteDe(d as Doc, Number(user.id), commentaires.get(Number(d.id)) ?? 0));
}

export async function chargerIdee(user: UtilisateurSession, id: number): Promise<IdeeDetail | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "ideas",
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user,
  });
  const doc = docs[0] as Doc | undefined;
  if (!doc) return null;
  const commentaires = await listerCommentaires(payload, user, "ideas", id);
  return { ...carteDe(doc, Number(user.id), commentaires.length), commentaires };
}

/** Les matchs du calendrier, du mois passe a la fin de la saison, pour rattacher une idee. */
export async function listerMatchs(user: UtilisateurSession): Promise<MatchChoix[]> {
  const payload = await getPayloadClient();
  const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { docs } = await payload.find({
    collection: "events",
    where: { and: [{ starts_at: { greater_than_equal: depuis } }, { source: { in: ["lffs", "manual"] } }] },
    sort: "starts_at",
    limit: 100,
    depth: 0,
    select: { title: true, starts_at: true },
    overrideAccess: false,
    user,
  });
  return docs.map((d) => ({ id: Number(d.id), titre: String(d.title ?? ""), debut: String(d.starts_at ?? "") }));
}
