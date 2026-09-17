import type { Payload } from "payload";

import { composerDateHeure } from "@/hub/dates";
import { camp, jourDuMatch, scoreDe, type MatchLffs } from "@/hub/matchs/construction";
import { getPayloadClient } from "@/lib/payload";
import { getTeamsIndex } from "@/lib/getTeamsIndex";
import { ficheDe, type JoueurFiche } from "./fiche";
import {
  butsDuClub,
  depuisTableauxMatch,
  etatSaisie,
  trierJoueurs,
  type EtatSaisie,
  type LigneStats,
  type Poste,
} from "./schema";

export { ficheDe, type JoueurFiche };

/**
 * La lecture du module Joueurs : l'effectif de la collection Joueurs et les
 * matchs de la saison active de la collection Matchs, telle que l'import LFFS
 * la remplit. Le droit d'y acceder est celui du module, verifie par la page
 * ou l'action ; la lecture elle-meme se fait en systeme, ces deux collections
 * ne portant pas de regle par personne dans le Hub.
 */

/** Ce que la feuille de stats a besoin de savoir d'un joueur. */
export type JoueurFeuille = Pick<
  JoueurFiche,
  "id" | "prenom" | "nom" | "poste" | "gardien" | "numero" | "capitaine"
>;

export type MatchStats = {
  id: number;
  lffsId: number | null;
  /** Le coup d'envoi en ISO, ou null pour un match sans date. */
  debut: string | null;
  /** Vrai quand la LFFS n'a pas encore donne l'heure. */
  sansHeure: boolean;
  adversaire: string;
  domicile: boolean;
  competition: string | null;
  score: string | null;
  /** Les buts du club, dans le sens du score. */
  butsClub: number | null;
  nbLignes: number;
  etat: EtatSaisie;
};

/** Un match de la liste : toujours date. */
export type MatchDate = MatchStats & { debut: string };

export type FeuilleStats = {
  match: MatchStats;
  joueurs: JoueurFeuille[];
  lignes: LigneStats[];
  modifieLe: string;
};

type Doc = Record<string, unknown> & { id: number | string };

/** Toute la collection Joueurs, actifs ou non, staff compris, tries par numero puis par nom. */
export async function listerEffectif(payload?: Payload): Promise<JoueurFiche[]> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({ collection: "players", limit: 500, depth: 1 });
  return trierJoueurs((docs as Doc[]).map(ficheDe));
}

/** Une fiche, relue avec sa photo. Null si elle n'existe pas. */
export async function chargerFiche(id: number, payload?: Payload): Promise<JoueurFiche | null> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({ collection: "players", where: { id: { equals: id } }, limit: 1, depth: 1 });
  const doc = docs[0] as Doc | undefined;
  return doc ? ficheDe(doc) : null;
}

/**
 * L'effectif de la feuille de match : les joueurs actifs, gardiens et joueurs
 * de champ. Le staff n'y figure pas, ni une fiche dont le poste n'est pas
 * renseigne. Tries par numero, puis par nom.
 */
export async function listerJoueurs(payload?: Payload): Promise<JoueurFeuille[]> {
  const client = payload ?? (await getPayloadClient());
  const { docs } = await client.find({ collection: "players", where: { actif: { equals: true } }, limit: 500, depth: 0 });
  return trierJoueurs((docs as Doc[]).map(ficheDe).filter((j) => j.surFeuille));
}

/** Les postes par identifiant, pour ranger chaque ligne dans le bon tableau. */
export function postesDe(joueurs: readonly JoueurFeuille[]): Map<number, Poste | null> {
  return new Map(joueurs.map((j) => [j.id, j.poste ?? "Joueur"]));
}

type ContexteMatchs = {
  saisonActiveId: number | null;
  camp: (match: Pick<MatchLffs, "home_team" | "away_team">) => { domicile: boolean; adversaire: string };
};

/** Le club vu de la collection Equipes et des reglages, comme la synchronisation du calendrier. */
async function chargerContexteMatchs(payload: Payload): Promise<ContexteMatchs> {
  const [reglages, equipes, club, saisons] = await Promise.all([
    payload.findGlobal({ slug: "hub-settings", depth: 0 }),
    getTeamsIndex(payload),
    payload.find({ collection: "teams", where: { is_club: { equals: true } }, limit: 1, depth: 0 }),
    payload.find({ collection: "seasons", where: { active: { equals: true } }, limit: 1, depth: 0 }),
  ]);
  const nomClubEquipe = typeof club.docs[0]?.name === "string" ? club.docs[0].name.trim() : "";
  const construction = {
    nomClub: nomClubEquipe || String(reglages.club_display_name ?? "UD Asturiana"),
    motifClub: String(reglages.club_match_pattern ?? ""),
    equipes,
  };
  return {
    saisonActiveId: saisons.docs[0] ? Number(saisons.docs[0].id) : null,
    camp: (match) => camp(match, construction),
  };
}

function matchDe(doc: Doc, contexte: ContexteMatchs): MatchStats {
  const match = doc as unknown as MatchLffs;
  const { domicile, adversaire } = contexte.camp(match);
  const jour = jourDuMatch(match);
  const heure = match.time ? /^(\d{2}):(\d{2})/.exec(match.time)?.[0] : undefined;
  const debut = jour ? composerDateHeure(jour, heure ?? "00:00") : null;
  const score = scoreDe(match);
  const nbLignes = depuisTableauxMatch(doc).length;
  return {
    id: Number(doc.id),
    lffsId: typeof match.lffs_id === "number" ? match.lffs_id : null,
    debut: debut ? debut.toISOString() : null,
    sansHeure: !heure,
    adversaire,
    domicile,
    competition: match.serie_reference?.trim() || null,
    score,
    butsClub: butsDuClub(score, domicile),
    nbLignes,
    etat: etatSaisie({ score, nbLignes }),
  };
}

/**
 * Les matchs dates de la saison active, les plus recents en tete, le match
 * d'essai exclu. Un match sans date, une finale de coupe a jouer, n'a rien a
 * faire ici tant que la LFFS ne l'a pas fixe. Sans saison active, rien :
 * c'est elle qui delimite les statistiques du site.
 */
export async function listerMatchsSaison(): Promise<{ matchs: MatchDate[]; saisonActive: boolean }> {
  const payload = await getPayloadClient();
  const contexte = await chargerContexteMatchs(payload);
  if (contexte.saisonActiveId === null) return { matchs: [], saisonActive: false };
  const { docs } = await payload.find({
    collection: "matches",
    where: { and: [{ season: { equals: contexte.saisonActiveId } }, { essai: { not_equals: true } }] },
    sort: "-date",
    limit: 200,
    depth: 0,
  });
  const matchs = (docs as Doc[])
    .map((doc) => matchDe(doc, contexte))
    .filter((m): m is MatchDate => m.debut !== null)
    .sort((a, b) => b.debut.localeCompare(a.debut));
  return { matchs, saisonActive: true };
}

/**
 * La feuille d'un match de la saison active : le match, l'effectif et les
 * lignes deja saisies. Null si le match n'existe pas, est un essai ou
 * n'appartient pas a la saison active.
 */
export async function chargerFeuilleStats(matchId: number): Promise<FeuilleStats | null> {
  const payload = await getPayloadClient();
  const [contexte, joueurs, resultat] = await Promise.all([
    chargerContexteMatchs(payload),
    listerJoueurs(payload),
    payload.find({ collection: "matches", where: { id: { equals: matchId } }, limit: 1, depth: 0 }),
  ]);
  const doc = resultat.docs[0] as Doc | undefined;
  if (!doc || doc.essai === true) return null;
  const saison = doc.season;
  const saisonId = typeof saison === "object" && saison !== null ? Number((saison as { id?: unknown }).id) : Number(saison);
  if (contexte.saisonActiveId === null || saisonId !== contexte.saisonActiveId) return null;

  // Un joueur passe inactif ou retire de l'effectif garde sa ligne : elle
  // compte sur le site. La feuille le montre a part, en lecture.
  const lignes = depuisTableauxMatch(doc);
  const connus = new Set(joueurs.map((j) => j.id));
  const manquants = lignes.filter((l) => !connus.has(l.joueurId)).map((l) => l.joueurId);
  let tous = joueurs;
  if (manquants.length > 0) {
    const { docs } = await payload.find({ collection: "players", where: { id: { in: manquants } }, limit: 100, depth: 0 });
    tous = [...joueurs, ...(docs as Doc[]).map(ficheDe)];
  }

  return {
    match: matchDe(doc, contexte),
    joueurs: tous,
    lignes,
    modifieLe: String(doc.updatedAt ?? ""),
  };
}
