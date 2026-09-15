import { cookies } from "next/headers";

import type { Match } from "./getMatchs";
import { getTeamsIndex } from "./getTeamsIndex";
import {
  salleDepuisTexte,
  salleVersTexte,
  type SalleXbotgo,
} from "./getXbotgoLive";
import { getPayloadClient } from "./payload";
import { resolveTeam } from "./teams";

/**
 * L'essai du direct : jouer une diffusion sur le site sans attendre un match.
 *
 * Un cookie, pose par `/api/salle-essai`, dit ce qui tient lieu de diffusion :
 * une salle XbotGo en cours (n'importe laquelle, celle d'un autre club fait
 * l'affaire) ou le flux public d'essai. Les traces d'audience et le rapport
 * vont a un match d'essai dedie, coche « essai » dans l'administration, que le
 * site cree lui-meme et n'affiche jamais.
 *
 * Tout ceci n'existe qu'en developpement : en production, le cookie ne peut
 * rien, le match d'essai n'est jamais cherche, et la route repond 404.
 */

export const COOKIE_ESSAI = "salle-essai";

/** Le nom du rapport d'un essai dans Rapports de diffusion. */
export const AFFICHE_ESSAI = "Match d'essai";

const VALEUR_FLUX = "flux";

export type EssaiDuDirect =
  | { type: "salle"; salle: SalleXbotgo }
  | { type: "flux" };

export function essaiPermis(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Le contenu du cookie : `flux`, ou une salle sous la forme `id:REGION`. */
export function essaiDepuisTexte(texte: string): EssaiDuDirect | null {
  if (texte === VALEUR_FLUX) return { type: "flux" };

  const salle = salleDepuisTexte(texte);
  return salle ? { type: "salle", salle } : null;
}

export function essaiVersTexte(essai: EssaiDuDirect): string {
  return essai.type === "flux" ? VALEUR_FLUX : salleVersTexte(essai.salle);
}

/** L'essai en cours d'apres le cookie, ou null. Jamais rien en production. */
export async function essaiDuDirect(): Promise<EssaiDuDirect | null> {
  if (!essaiPermis()) return null;

  return essaiDepuisTexte((await cookies()).get(COOKIE_ESSAI)?.value ?? "");
}

type Payload = Awaited<ReturnType<typeof getPayloadClient>>;

async function trouverLeMatchDEssai(payload: Payload) {
  const { docs } = await payload.find({
    collection: "matches",
    where: { essai: { equals: true } },
    limit: 1,
    depth: 0,
  });

  return docs[0] ?? null;
}

type DocumentMatch = NonNullable<
  Awaited<ReturnType<typeof trouverLeMatchDEssai>>
>;

// La meme forme que `getMatchs`, qui exclut le match d'essai : le direct et le
// compteur le prennent par ici quand un essai est en cours.
async function versMatch(payload: Payload, doc: DocumentMatch): Promise<Match> {
  const teams = await getTeamsIndex(payload);
  const home = resolveTeam(teams, doc.home_team);
  const away = resolveTeam(teams, doc.away_team);

  return {
    id: doc.id as number,
    date: doc.date ? doc.date.split("T")[0] : "",
    time: doc.time ? doc.time.slice(0, 5) : "",
    homeTeam: home.name,
    homeTeamLogo: home.logo,
    homeIsClub: home.isClub,
    awayTeam: away.name,
    awayTeamLogo: away.logo,
    awayIsClub: away.isClub,
    homeScore: doc.score_home as number,
    awayScore: doc.score_away as number,
    venueId: doc.venue_id as number,
    venueName: doc.venue_name ?? "",
    serieReference: doc.serie_reference ?? "ESSAI",
    competitionName: "Essai",
    liveLink: doc.live_link ?? "",
    replayLink: doc.replay_link ?? "",
  };
}

/** Le match d'essai s'il existe, jamais en production. */
export async function matchDEssai(): Promise<Match | null> {
  if (!essaiPermis()) return null;

  const payload = await getPayloadClient();
  const doc = await trouverLeMatchDEssai(payload);

  return doc ? versMatch(payload, doc) : null;
}

/** Le match d'essai, seulement pendant qu'un essai est en cours. */
export async function matchDEssaiActif(): Promise<Match | null> {
  return (await essaiDuDirect()) ? matchDEssai() : null;
}

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/**
 * Cree le match d'essai s'il manque, et le date de maintenant.
 *
 * Le coup d'envoi a l'instant : la fenetre du match (un quart d'heure avant,
 * soixante-dix minutes apres) est ouverte pour l'essai qui commence, et le
 * compteur accepte les signes de vie comme un soir de match. Un seul document
 * pour tous les essais : chacun le redate, et les traces de la fois d'avant
 * restent lisibles dans l'administration jusqu'a ce qu'on les efface.
 */
export async function preparerLeMatchDEssai(): Promise<Match> {
  const payload = await getPayloadClient();
  const maintenant = new Date();
  const date = `${maintenant.getFullYear()}-${deuxChiffres(maintenant.getMonth() + 1)}-${deuxChiffres(maintenant.getDate())}`;
  const time = `${deuxChiffres(maintenant.getHours())}:${deuxChiffres(maintenant.getMinutes())}:00`;
  const existant = await trouverLeMatchDEssai(payload);

  // Reposee a chaque essai, noms compris : le document n'est pas fait pour
  // etre edite a la main, et un nom retouche ne doit pas survivre.
  const fiche = {
    // Le nom tel que l'import LFFS l'ecrit : c'est lui que l'index des
    // equipes reconnait, avec le blason et le statut de club.
    home_team: "UNION DEPORTIVA ASTURIANA BRUXELLES",
    away_team: "Équipe d'essai",
    serie_reference: "ESSAI",
    venue_name: "Salle d'essai",
    date: `${date}T00:00:00.000Z`,
    time,
  };

  const doc = existant
    ? await payload.update({
        collection: "matches",
        id: existant.id,
        data: fiche,
      })
    : await payload.create({
        collection: "matches",
        data: { essai: true, ...fiche },
      });

  return versMatch(payload, doc as DocumentMatch);
}
