import type { Where } from "payload";

import { idDe } from "@/hub/droits";
import { chargerDurees, finOuParDefaut } from "@/hub/calendrier/duree";
import { lexicalVersTexte } from "@/hub/texte";
import { getPayloadClient } from "@/lib/payload";
import type { EvenementIcal, FluxIcal, ReglagesIcal } from "./ical";

/**
 * La lecture cote serveur pour les flux iCal. Le jeton est la seule cle :
 * la lecture se fait sans droits d'utilisateur, il n'y en a pas derriere un
 * abonnement de telephone. Un jeton inconnu ou un flux inactif : null.
 */

export type FluxCharge = FluxIcal & { id: number; description: string | null; color: string | null; token: string };

type Doc = Record<string, unknown> & { id: number | string };

export async function chargerFluxParJeton(token: string): Promise<FluxCharge | null> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "feeds",
    where: { and: [{ token: { equals: token } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
  });
  const doc = docs[0] as Doc | undefined;
  if (!doc) return null;
  const options = (doc.options as FluxIcal["options"] | undefined) ?? {};
  return {
    id: Number(doc.id),
    name: String(doc.name ?? ""),
    slug: String(doc.slug ?? ""),
    emoji: (doc.emoji as string | null) ?? null,
    alarms: Boolean(doc.alarms),
    options,
    description: (doc.description as string | null) ?? null,
    color: (doc.color as string | null) ?? null,
    token: String(doc.token),
  };
}

/** De J-90 a la fin de la saison active, ou J+365 sans saison datee. */
export async function plageDuFlux(maintenant = new Date()): Promise<{ debut: Date; fin: Date }> {
  const payload = await getPayloadClient();
  const debut = new Date(maintenant.getTime() - 90 * 24 * 60 * 60 * 1000);
  const parDefaut = new Date(maintenant.getTime() + 365 * 24 * 60 * 60 * 1000);
  const { docs } = await payload.find({
    collection: "seasons",
    where: { active: { equals: true } },
    limit: 1,
    depth: 0,
  });
  const finSaison = docs[0]?.end_date ? new Date(String(docs[0].end_date)) : null;
  const fin = finSaison && finSaison.getTime() > maintenant.getTime() ? finSaison : parDefaut;
  return { debut, fin };
}

export async function chargerReglagesIcal(): Promise<ReglagesIcal> {
  const payload = await getPayloadClient();
  const reglages = await payload.findGlobal({ slug: "hub-settings", depth: 0 });
  return {
    heureRappelMatin: String(reglages?.morning_reminder_time ?? "09:00"),
    delaiRappelAvantMinutes: Number(reglages?.reminder_before_minutes ?? 60),
  };
}

const prenomDe = (u: unknown): string => {
  if (!u || typeof u !== "object") return "";
  const doc = u as { first_name?: string | null; email?: string | null };
  return doc.first_name?.trim() || doc.email?.split("@")[0] || "";
};

const nomDe = (doc: unknown): string | null =>
  doc && typeof doc === "object" ? String((doc as { name?: string }).name ?? "") || null : null;

export async function chargerEvenementsDuFlux(
  fluxId: number,
  plage: { debut: Date; fin: Date },
): Promise<EvenementIcal[]> {
  const payload = await getPayloadClient();
  const where: Where = {
    and: [
      { feeds: { in: [fluxId] } },
      { starts_at: { less_than_equal: plage.fin.toISOString() } },
      {
        or: [
          { starts_at: { greater_than_equal: plage.debut.toISOString() } },
          { ends_at: { greater_than_equal: plage.debut.toISOString() } },
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
      limit: 1000,
      depth: 1,
    }),
    chargerDurees(payload),
  ]);

  return docs.map((brut) => {
    const doc = brut as Doc;
    const type = doc.type as { category?: string } | number | null;
    const categorie = (typeof type === "object" && type ? type.category : "other") as EvenementIcal["categorie"];
    const reseaux = (Array.isArray(doc.networks) ? doc.networks : []).map(nomDe).filter((n): n is string => !!n);
    const responsables = (Array.isArray(doc.responsibles) ? doc.responsibles : []).map(prenomDe).filter(Boolean);
    return {
      id: Number(doc.id),
      titre: String(doc.title ?? ""),
      debut: String(doc.starts_at),
      fin:
        finOuParDefaut(
          new Date(String(doc.starts_at)),
          doc.ends_at ? new Date(String(doc.ends_at)) : null,
          Boolean(doc.all_day),
          categorie,
          durees,
        )?.toISOString() ?? null,
      journeeEntiere: Boolean(doc.all_day),
      annule: Boolean(doc.cancelled),
      pasDeRappel: Boolean(doc.no_reminder),
      categorie,
      statut: (doc.status as EvenementIcal["statut"]) ?? null,
      reseaux,
      format: Array.isArray(doc.format) ? doc.format.map(nomDe).filter(Boolean).join(", ") || null : nomDe(doc.format),
      lieuNom: (doc.location_name as string | null) ?? null,
      lieuAdresse: (doc.location_address as string | null) ?? null,
      heureRdv: (doc.meeting_at as string | null) ?? null,
      description: lexicalVersTexte(doc.description),
      responsables,
      legende: String(doc.caption ?? ""),
      lienVisuels: String(doc.visuals_link ?? ""),
      recurrence: (doc.recurrence as EvenementIcal["recurrence"]) ?? null,
      creeLe: String(doc.createdAt ?? doc.starts_at),
      modifieLe: String(doc.updatedAt ?? doc.createdAt ?? doc.starts_at),
    };
  });
}

/** Un flux par identifiant, pour l'administration. */
export async function chargerFluxParId(id: number): Promise<{ token: string; name: string } | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({ collection: "feeds", where: { id: { equals: id } }, limit: 1, depth: 0 });
  const doc = docs[0] as Doc | undefined;
  return doc ? { token: String(doc.token), name: String(doc.name ?? "") } : null;
}

export { idDe };
