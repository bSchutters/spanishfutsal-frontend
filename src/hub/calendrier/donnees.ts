import type { Payload, Where } from "payload";

import { idDe, type UtilisateurHub } from "@/hub/droits";
import { estRecurrent, occurrences, type Recurrence } from "@/hub/recurrence";
import type { UtilisateurSession } from "@/hub/session";
import { lexicalVersTexte } from "@/hub/texte";
import { getPayloadClient } from "@/lib/payload";
import { chargerDurees, finOuParDefaut } from "./duree";

/**
 * La lecture des donnees du calendrier, toujours avec les droits de la
 * personne : `overrideAccess: false` fait appliquer les regles des
 * collections, dont le filtre par flux. Ce que le client recoit est une
 * forme allegee, sans les notes internes ni rien de superflu.
 */

export type Categorie = "post" | "match" | "training" | "other";
export type StatutPost = "to_create" | "ready" | "published" | "cancelled";

export type Reference = { id: number; nom: string };

export type References = {
  types: Array<Reference & { categorie: Categorie; couleur: string | null; emoji: string | null; fluxParDefaut: number[] }>;
  flux: Array<Reference & { slug: string; couleur: string | null }>;
  reseaux: Reference[];
  formats: Reference[];
  responsables: Array<Reference & { email: string; prenom: string }>;
  reglages: {
    dureeMatchMinutes: number;
    dureeEntrainementMinutes: number;
    delaiRdvMatchMinutes: number;
  };
};

/** Un evenement tel que le calendrier l'affiche. Une ligne par occurrence. */
export type EvenementCalendrier = {
  id: number;
  cle: string;
  titre: string;
  debut: string;
  fin: string | null;
  journeeEntiere: boolean;
  annule: boolean;
  categorie: Categorie;
  typeId: number;
  /** La couleur du premier flux, sinon celle du type. */
  couleur: string | null;
  couleurType: string | null;
  fluxIds: number[];
  responsablesIds: number[];
  creeParId: number | null;
  statut: StatutPost | null;
  source: "lffs" | "manual" | null;
  recurrent: boolean;
  lieuNom: string | null;
};

export type Commentaire = {
  id: number;
  auteurId: number | null;
  auteur: string;
  contenu: string;
  creeLe: string;
};

/** Le detail complet d'un evenement, pour le panneau et le formulaire. */
export type EvenementDetail = {
  id: number;
  titre: string;
  typeId: number;
  categorie: Categorie;
  debut: string;
  fin: string | null;
  journeeEntiere: boolean;
  heureRdv: string | null;
  lieuNom: string | null;
  lieuAdresse: string | null;
  fluxIds: number[];
  fluxPrincipalId: number | null;
  responsablesIds: number[];
  description: string;
  notesInternes: string;
  annule: boolean;
  pasDeRappel: boolean;
  recurrence: { frequence: "none" | "weekly" | "monthly"; intervalle: number; jours: string[]; jusquAu: string | null };
  post: {
    statut: StatutPost;
    reseauxIds: number[];
    formatIds: number[];
    legende: string;
    lienVisuels: string;
    lienPublication: string;
    vues: number | null;
    matchLieId: number | null;
    modeleId: number | null;
  };
  match: {
    source: "lffs" | "manual" | null;
    adversaire: string;
    domicile: boolean;
    competition: string;
    score: string;
    lffsId: number | null;
  };
  verrouille: boolean;
  /** Pour un match : les posts generes ou rattaches a ce match. */
  postsLies: Array<{ id: number; titre: string; debut: string; statut: StatutPost; annule: boolean }>;
  creeLe: string;
  modifieLe: string;
  commentaires: Commentaire[];
};

type Utilisateur = UtilisateurSession;

/** Le prenom seul, sinon la partie de l'adresse avant l'arobase, comme partout dans le Hub. */
const nomDe = (u: { first_name?: string | null; last_name?: string | null; email?: string | null }) =>
  u.first_name?.trim() || u.email?.split("@")[0] || "";

/** Liste d'identifiants depuis une relation, peuplee ou non. */
const ids = (relations: unknown): number[] =>
  Array.isArray(relations) ? relations.map((r) => Number(idDe(r as never))).filter((n) => !Number.isNaN(n)) : [];

export async function chargerReferences(user: Utilisateur): Promise<References> {
  const payload = await getPayloadClient();
  const commun = { depth: 0 as const, limit: 100, overrideAccess: false, user };

  const [types, flux, reseaux, formats, reglages, responsables] = await Promise.all([
    payload.find({ collection: "event-types", sort: "order", ...commun }),
    payload.find({ collection: "feeds", sort: "order", where: { active: { equals: true } }, ...commun }),
    payload.find({ collection: "networks", sort: "order", where: { active: { equals: true } }, ...commun }),
    payload.find({ collection: "formats", sort: "order", where: { active: { equals: true } }, ...commun }),
    payload.findGlobal({ slug: "hub-settings", depth: 0, overrideAccess: false, user }),
    // Les responsables sont les autres membres du Hub : leur nom, rien de
    // plus, d'ou la lecture sans droits mais avec une selection de champs.
    payload.find({
      collection: "users",
      depth: 0,
      limit: 100,
      sort: "first_name",
      where: { or: [{ role: { equals: "admin" } }, { "hub.access": { equals: true } }] },
      select: { first_name: true, last_name: true, email: true },
    }),
  ]);

  return {
    types: types.docs.map((t) => ({
      id: Number(t.id),
      nom: String(t.name),
      categorie: t.category as Categorie,
      couleur: (t.color as string | null) ?? null,
      emoji: (t.emoji as string | null) ?? null,
      fluxParDefaut: ids(t.default_feeds),
    })),
    flux: flux.docs.map((f) => ({
      id: Number(f.id),
      nom: String(f.name),
      slug: String(f.slug ?? ""),
      couleur: (f.color as string | null) ?? null,
    })),
    reseaux: reseaux.docs.map((r) => ({ id: Number(r.id), nom: String(r.name) })),
    formats: formats.docs.map((f) => ({ id: Number(f.id), nom: String(f.name) })),
    responsables: responsables.docs.map((u) => ({
      id: Number(u.id),
      nom: nomDe(u as { first_name?: string | null; last_name?: string | null; email?: string | null }),
      prenom: String(u.first_name ?? "").trim() || String(u.email ?? "").split("@")[0],
      email: String(u.email ?? ""),
    })),
    reglages: {
      dureeMatchMinutes: Number(reglages?.match_duration_minutes ?? 75),
      dureeEntrainementMinutes: Number(reglages?.training_duration_minutes ?? 90),
      delaiRdvMatchMinutes: Number(reglages?.match_meeting_offset_minutes ?? 45),
    },
  };
}

type DocEvenement = Record<string, unknown> & { id: number | string };

const categorieDe = (doc: DocEvenement): Categorie => {
  const type = doc.type as { category?: string } | number | null;
  const c = typeof type === "object" && type ? type.category : undefined;
  return (c as Categorie) ?? "other";
};

const couleurTypeDe = (doc: DocEvenement): string | null => {
  const type = doc.type as { color?: string | null } | number | null;
  return typeof type === "object" && type ? (type.color ?? null) : null;
};

/** La couleur du flux principal, sinon celle du premier flux. */
const couleurFluxDe = (doc: DocEvenement): string | null => {
  const principal = doc.primary_feed as { color?: string | null } | number | null | undefined;
  if (typeof principal === "object" && principal?.color) return principal.color;
  const flux = doc.feeds as Array<{ color?: string | null } | number> | undefined;
  const premier = flux?.[0];
  return typeof premier === "object" && premier ? (premier.color ?? null) : null;
};

const recurrenceDe = (doc: DocEvenement): Recurrence | null => (doc.recurrence as Recurrence | null) ?? null;

/**
 * Les evenements d'une plage, occurrences des recurrences comprises. La
 * requete est bornee : ce qui commence apres la fin, ou finit avant le debut
 * sans etre recurrent, n'est pas lu.
 */
export async function listerEvenements(
  user: Utilisateur,
  plage: { debut: Date; fin: Date },
): Promise<EvenementCalendrier[]> {
  const payload = await getPayloadClient();
  const debutIso = plage.debut.toISOString();
  const finIso = plage.fin.toISOString();
  // Un evenement sans fin dure une heure au plus : deux jours de marge suffisent.
  const marge = new Date(plage.debut.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const where: Where = {
    and: [
      { starts_at: { less_than_equal: finIso } },
      {
        or: [
          { starts_at: { greater_than_equal: marge } },
          { ends_at: { greater_than_equal: debutIso } },
          { "recurrence.frequency": { in: ["weekly", "monthly"] } },
        ],
      },
    ],
  };

  const [{ docs }, durees] = await Promise.all([
    payload.find({
      collection: "events",
      where,
      sort: "starts_at",
      limit: 500,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    chargerDurees(payload),
  ]);

  const resultat: EvenementCalendrier[] = [];
  for (const brut of docs) {
    const doc = brut as DocEvenement;
    const recurrence = recurrenceDe(doc);
    const base = {
      id: Number(doc.id),
      titre: String(doc.title ?? ""),
      journeeEntiere: Boolean(doc.all_day),
      annule: Boolean(doc.cancelled),
      categorie: categorieDe(doc),
      typeId: Number(idDe(doc.type as never)),
      couleur: couleurFluxDe(doc) ?? couleurTypeDe(doc),
      couleurType: couleurTypeDe(doc),
      fluxIds: ids(doc.feeds),
      responsablesIds: ids(doc.responsibles),
      creeParId: doc.created_by ? Number(idDe(doc.created_by as never)) : null,
      statut: (doc.status as StatutPost | null) ?? null,
      source: (doc.source as "lffs" | "manual" | null) ?? null,
      recurrent: estRecurrent(recurrence),
      lieuNom: (doc.location_name as string | null) ?? null,
    };
    for (const occ of occurrences(
      { starts_at: String(doc.starts_at), ends_at: doc.ends_at as string | null, recurrence },
      plage,
    )) {
      const debut = occ.debut.toISOString();
      // Sans fin, la duree de la categorie : le calendrier et les flux montrent la meme chose.
      const fin = finOuParDefaut(occ.debut, occ.fin, base.journeeEntiere, base.categorie, durees);
      resultat.push({
        ...base,
        cle: base.recurrent ? `${base.id}@${debut}` : String(base.id),
        debut,
        fin: fin ? fin.toISOString() : null,
      });
    }
  }
  return resultat;
}

/** Un evenement complet, ou null s'il n'existe pas pour cette personne. */
export async function chargerEvenement(user: Utilisateur, id: number): Promise<EvenementDetail | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "events",
    where: { id: { equals: id } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
    user,
  });
  const doc = docs[0] as DocEvenement | undefined;
  if (!doc) return null;

  const recurrence = recurrenceDe(doc);
  const source = (doc.source as "lffs" | "manual" | null) ?? null;
  const [commentaires, postsLies] = await Promise.all([
    listerCommentaires(payload, user, "events", id),
    categorieDe(doc) === "match" ? listerPostsLies(payload, user, id) : Promise.resolve([]),
  ]);

  return {
    id: Number(doc.id),
    titre: String(doc.title ?? ""),
    typeId: Number(idDe(doc.type as never)),
    categorie: categorieDe(doc),
    debut: String(doc.starts_at),
    fin: (doc.ends_at as string | null) ?? null,
    journeeEntiere: Boolean(doc.all_day),
    heureRdv: (doc.meeting_at as string | null) ?? null,
    lieuNom: (doc.location_name as string | null) ?? null,
    lieuAdresse: (doc.location_address as string | null) ?? null,
    fluxIds: ids(doc.feeds),
    fluxPrincipalId: doc.primary_feed ? Number(idDe(doc.primary_feed as never)) : null,
    responsablesIds: ids(doc.responsibles),
    description: lexicalVersTexte(doc.description),
    notesInternes: lexicalVersTexte(doc.internal_notes),
    annule: Boolean(doc.cancelled),
    pasDeRappel: Boolean(doc.no_reminder),
    recurrence: {
      frequence: (recurrence?.frequency as "none" | "weekly" | "monthly") ?? "none",
      intervalle: Math.max(1, Number(recurrence?.interval ?? 1)),
      jours: (recurrence?.weekdays as string[] | null) ?? [],
      jusquAu: recurrence?.until ?? null,
    },
    post: {
      statut: (doc.status as StatutPost | null) ?? "to_create",
      reseauxIds: ids(doc.networks),
      formatIds: ids(doc.format),
      legende: String(doc.caption ?? ""),
      lienVisuels: String(doc.visuals_link ?? ""),
      lienPublication: String(doc.publication_link ?? ""),
      vues: doc.views === null || doc.views === undefined ? null : Number(doc.views),
      matchLieId: doc.linked_match ? Number(idDe(doc.linked_match as never)) : null,
      modeleId: doc.template ? Number(idDe(doc.template as never)) : null,
    },
    match: {
      source,
      adversaire: String(doc.opponent ?? ""),
      domicile: doc.home === undefined || doc.home === null ? true : Boolean(doc.home),
      competition: String(doc.competition ?? ""),
      score: String(doc.score ?? ""),
      lffsId: doc.lffs_id === null || doc.lffs_id === undefined ? null : Number(doc.lffs_id),
    },
    verrouille: source === "lffs",
    postsLies,
    creeLe: String(doc.createdAt ?? ""),
    modifieLe: String(doc.updatedAt ?? ""),
    commentaires,
  };
}

/** Les posts rattaches a un match, dans l'ordre du calendrier, avec les droits de la personne. */
async function listerPostsLies(payload: Payload, user: Utilisateur, matchId: number) {
  const { docs } = await payload.find({
    collection: "events",
    where: { linked_match: { equals: matchId } },
    sort: "starts_at",
    limit: 50,
    depth: 0,
    overrideAccess: false,
    user,
  });
  return docs.map((p) => ({
    id: Number(p.id),
    titre: String(p.title ?? ""),
    debut: String(p.starts_at ?? ""),
    statut: ((p as DocEvenement).status as StatutPost | null) ?? "to_create",
    annule: Boolean(p.cancelled),
  }));
}

export async function listerCommentaires(
  payload: Payload,
  user: Utilisateur,
  relationTo: "events" | "ideas",
  id: number,
): Promise<Commentaire[]> {
  const { docs } = await payload.find({
    collection: "comments",
    where: { and: [{ "target.relationTo": { equals: relationTo } }, { "target.value": { equals: id } }] },
    sort: "createdAt",
    limit: 200,
    depth: 1,
    overrideAccess: false,
    user,
  });
  return docs.map((c) => {
    const auteur = c.author as (UtilisateurHub & { first_name?: string | null; last_name?: string | null; email?: string }) | number | null;
    return {
      id: Number(c.id),
      auteurId: auteur === null || auteur === undefined ? null : Number(idDe(auteur as never)),
      auteur: typeof auteur === "object" && auteur ? nomDe(auteur) : "",
      contenu: String(c.content ?? ""),
      creeLe: String(c.createdAt ?? ""),
    };
  });
}

/** Les posts a traiter : a creer ou prets, du plus ancien au plus recent. */
export async function listerPostsAFaire(user: Utilisateur, seulementLesMiens: boolean) {
  const payload = await getPayloadClient();
  const where: Where = {
    and: [
      { status: { in: ["to_create", "ready"] } },
      { cancelled: { not_equals: true } },
      ...(seulementLesMiens ? [{ responsibles: { equals: user.id } }] : []),
    ],
  };
  const { docs } = await payload.find({
    collection: "events",
    where,
    sort: "starts_at",
    limit: 300,
    depth: 1,
    overrideAccess: false,
    user,
  });
  const maintenant = Date.now();
  return docs
    .map((brut) => brut as DocEvenement)
    .filter((doc) => categorieDe(doc) === "post")
    .map((doc) => ({
      id: Number(doc.id),
      titre: String(doc.title ?? ""),
      debut: String(doc.starts_at),
      // En retard : la date est passee sans que le post soit publie ni annule.
      enRetard: new Date(String(doc.starts_at)).getTime() < maintenant,
      statut: (doc.status as StatutPost | null) ?? "to_create",
      couleur: couleurFluxDe(doc) ?? couleurTypeDe(doc),
      reseaux: (Array.isArray(doc.networks) ? doc.networks : [])
        .map((r) => (typeof r === "object" && r ? String((r as { name?: string }).name ?? "") : ""))
        .filter(Boolean),
      formats: (Array.isArray(doc.format) ? doc.format : [])
        .map((f) => (typeof f === "object" && f ? String((f as { name?: string }).name ?? "") : ""))
        .filter(Boolean),
      legende: String(doc.caption ?? ""),
      lienVisuels: String(doc.visuals_link ?? ""),
      responsablesIds: ids(doc.responsibles),
    }));
}
