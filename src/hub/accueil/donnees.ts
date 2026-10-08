import { chargerEvenement, listerEvenements, listerPostsAFaire } from "@/hub/calendrier/donnees";
import { listerLesDiffusions, evolution, type Diffusion } from "@/hub/direct/donnees";
import { modulesAccessibles, peutEditer } from "@/hub/droits";
import { compterIdeesAVoter } from "@/hub/idees/donnees";
import { listerEffectif, listerMatchsSaison, type MatchDate } from "@/hub/joueurs/donnees";
import { compterAPayer, compterCommandes } from "@/hub/pack/donnees";
import type { UtilisateurSession } from "@/hub/session";
import { anniversairesDeLaSemaine, type Anniversaire } from "./anniversaires";

/**
 * Ce que l'accueil du Hub montre a une personne. `blocs` dit ce qu'elle a le
 * droit de voir : un bloc ferme ne s'affiche pas du tout, ses donnees restent
 * vides sans avoir ete lues. Un bloc ouvert mais vide s'affiche et le dit.
 */

/** Jusqu'ou chercher le prochain match dans le calendrier. */
const HORIZON_MATCH_JOURS = 90;

/** Combien de posts de la personne l'accueil montre. */
const MES_POSTS = 3;

type PostAFaire = Awaited<ReturnType<typeof listerPostsAFaire>>[number];

export type ProchainMatch = {
  id: number;
  titre: string;
  debut: string;
  adversaire: string;
  domicile: boolean;
  competition: string;
  lieu: string | null;
};

export type DernierDirect = Diffusion & {
  /** L'ecart des spectateurs uniques avec la diffusion precedente, en pourcentage. */
  evolutionUniques: number | null;
};

export type Accueil = {
  blocs: {
    /** Retards, prochain match, posts de la personne, idees a voter. */
    calendrier: boolean;
    /** Anniversaires de la semaine. */
    joueurs: boolean;
    /** Feuilles de stats a remplir : reserve a qui peut les saisir. */
    saisieStats: boolean;
    /** Derniere diffusion. */
    direct: boolean;
    /** Commandes du Pack a passer chez Joma. */
    pack: boolean;
  };
  postsEnRetard: number;
  prochainMatch: ProchainMatch | null;
  mesPosts: PostAFaire[];
  ideesAVoter: number;
  feuillesARemplir: MatchDate[];
  anniversaires: Anniversaire[];
  dernierDirect: DernierDirect | null;
  commandesRecues: number;
  /** Commandes du Pack dont le virement n'est pas encore arrive. */
  commandesAPayer: number;
};

/** Le premier match a venir du calendrier, tel que la personne le voit, ou null s'il n'y en a pas. */
async function chargerProchainMatch(user: UtilisateurSession, maintenant: Date): Promise<ProchainMatch | null> {
  const fin = new Date(maintenant.getTime() + HORIZON_MATCH_JOURS * 24 * 60 * 60 * 1000);
  const evenements = await listerEvenements(user, { debut: maintenant, fin });
  const suivant = evenements.find(
    (e) => e.categorie === "match" && !e.annule && new Date(e.debut).getTime() >= maintenant.getTime(),
  );
  if (!suivant) return null;
  const detail = await chargerEvenement(user, suivant.id);
  if (!detail) return null;
  return {
    id: detail.id,
    titre: detail.titre,
    debut: suivant.debut,
    adversaire: detail.match.adversaire,
    domicile: detail.match.domicile,
    competition: detail.match.competition,
    lieu: detail.lieuNom,
  };
}

async function chargerDernierDirect(): Promise<DernierDirect | null> {
  const [dernier, precedent] = await listerLesDiffusions();
  if (!dernier) return null;
  return { ...dernier, evolutionUniques: precedent ? evolution(precedent.uniques, dernier.uniques) : null };
}

/**
 * Tous les blocs de l'accueil, charges en parallele. Chaque lecture passe par
 * les fonctions du module concerne, donc avec les memes regles que ses pages :
 * le calendrier et les idees avec les droits de la personne, l'effectif, les
 * stats et le direct derriere le droit sur leur module.
 */
export async function chargerAccueil(user: UtilisateurSession, maintenant = new Date()): Promise<Accueil> {
  const ouverts = new Set(modulesAccessibles(user));
  const blocs = {
    calendrier: ouverts.has("calendar"),
    joueurs: ouverts.has("players"),
    saisieStats: peutEditer(user, "players"),
    direct: ouverts.has("live"),
    pack: ouverts.has("pack"),
  };

  const [tousLesPosts, mesPosts, prochainMatch, ideesAVoter, effectif, matchs, dernierDirect, commandesRecues, commandesAPayer] = await Promise.all([
    blocs.calendrier ? listerPostsAFaire(user, false) : [],
    blocs.calendrier ? listerPostsAFaire(user, true) : [],
    blocs.calendrier ? chargerProchainMatch(user, maintenant) : null,
    blocs.calendrier ? compterIdeesAVoter(user) : 0,
    blocs.joueurs ? listerEffectif() : [],
    blocs.saisieStats ? listerMatchsSaison().then((r) => r.matchs) : [],
    blocs.direct ? chargerDernierDirect() : null,
    blocs.pack ? compterCommandes("received") : 0,
    blocs.pack ? compterAPayer() : 0,
  ]);

  return {
    blocs,
    postsEnRetard: tousLesPosts.filter((p) => p.enRetard).length,
    prochainMatch,
    mesPosts: mesPosts.slice(0, MES_POSTS),
    ideesAVoter,
    feuillesARemplir: matchs.filter((m) => m.etat === "a_saisir"),
    anniversaires: anniversairesDeLaSemaine(effectif, maintenant),
    dernierDirect,
    commandesRecues,
    commandesAPayer,
  };
}
