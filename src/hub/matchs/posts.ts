import type { Statut } from "@/hub/calendrier/schema";
import { ajouterJoursLocaux, composerDateHeure, versChampDate } from "@/hub/dates";
import type { ChampsMatch } from "./construction";
import { rendreLexical, rendreTexte, type Variables } from "./variables";

/**
 * Les posts generes pour un match LFFS : un par modele actif qui s'applique.
 * Ce module decide quoi creer et quoi modifier ; il ne lit ni n'ecrit la
 * base, ce qui permet de verifier chaque regle du cahier a sec.
 */

export type ModelePost = {
  id: number;
  nom: string;
  actif: boolean;
  appliquerA: "home" | "away" | "both";
  decalageJours: number;
  modeHeure: "fixed_time" | "relative_to_kickoff";
  heureFixe: string | null;
  decalageMinutes: number | null;
  titreModele: string;
  legendeModele: string | null;
  /** L'etat Lexical des instructions, copie rendu dans la description du post. */
  instructions: unknown;
  reseauxIds: number[];
  formatId: number | null;
  fluxIds: number[];
  responsablesIds: number[];
};

/** Un post deja genere pour ce match, tel qu'il est en base. */
export type PostExistant = {
  id: number;
  modeleId: number;
  debut: string;
  statut: Statut;
  annule: boolean;
  titre: string;
  legende: string;
  /** L'etat Lexical de la description, compare tel quel. */
  description: unknown;
  dateModifieeManuellement: boolean;
  legendeModifieeManuellement: boolean;
};

export type ContextePosts = {
  typePostId: number;
  /** Le flux Social, flux par defaut d'un modele qui n'en precise aucun. */
  fluxParDefautId: number | null;
};

/**
 * - `synchro` : le match a change, les posts suivent, sauf ce qui a ete regle a la main.
 * - `completer` : le bouton « Regenerer » sans option, ne cree que ce qui manque.
 * - `reinitialiser` : le bouton avec l'option, remet aussi les posts non publies a neuf.
 */
export type ModePlan = "synchro" | "completer" | "reinitialiser";

export type PlanPosts = {
  aCreer: Array<{ modeleId: number; data: Record<string, unknown> }>;
  aModifier: Array<{ id: number; data: Record<string, unknown> }>;
};

export function modeleSApplique(modele: Pick<ModelePost, "actif" | "appliquerA">, domicile: boolean): boolean {
  if (!modele.actif) return false;
  return modele.appliquerA === "both" || (modele.appliquerA === "home") === domicile;
}

/**
 * La date d'un post : le jour du match decale de N jours, a une heure fixe
 * de Bruxelles, ou le coup d'envoi decale de N jours et de N minutes.
 */
export function dateDuPost(
  debutMatch: string,
  modele: Pick<ModelePost, "decalageJours" | "modeHeure" | "heureFixe" | "decalageMinutes">,
): string {
  const jourDecale = ajouterJoursLocaux(debutMatch, modele.decalageJours);
  if (modele.modeHeure === "relative_to_kickoff") {
    return new Date(jourDecale.getTime() + (modele.decalageMinutes ?? 0) * 60_000).toISOString();
  }
  const heure = modele.heureFixe && /^\d{2}:\d{2}$/.test(modele.heureFixe) ? modele.heureFixe : "10:00";
  return (composerDateHeure(versChampDate(jourDecale), heure) ?? jourDecale).toISOString();
}

/** Les textes d'un post rendus depuis son modele. */
export function textesDuPost(modele: ModelePost, variables: Variables) {
  return {
    title: rendreTexte(modele.titreModele, variables).trim() || modele.nom,
    caption: rendreTexte(modele.legendeModele, variables) || null,
    description: rendreLexical(modele.instructions, variables),
  };
}

/** Tout ce qu'il faut pour creer le post d'un modele. */
export function champsDuPost(
  modele: ModelePost,
  champs: ChampsMatch,
  variables: Variables,
  contexte: ContextePosts,
): Record<string, unknown> {
  const flux = modele.fluxIds.length > 0 ? modele.fluxIds : contexte.fluxParDefautId ? [contexte.fluxParDefautId] : [];
  return {
    ...textesDuPost(modele, variables),
    type: contexte.typePostId,
    starts_at: dateDuPost(champs.starts_at, modele),
    ends_at: null,
    all_day: false,
    feeds: flux,
    primary_feed: flux[0] ?? null,
    responsibles: modele.responsablesIds,
    networks: modele.reseauxIds,
    format: modele.formatId,
    status: "to_create",
    cancelled: false,
    template: modele.id,
    date_edited_manually: false,
    caption_edited_manually: false,
  };
}

const FIGE: ReadonlyArray<Statut> = ["published", "cancelled"];

/**
 * Le plan pour un match : quels posts creer, lesquels modifier et comment.
 * Jamais deux posts pour le meme couple (match, modele) : un modele qui a
 * deja son post n'en recoit pas d'autre, quel que soit le mode.
 */
export function planifierPosts(args: {
  modeles: ModelePost[];
  existants: PostExistant[];
  champs: ChampsMatch;
  variables: Variables;
  contexte: ContextePosts;
  mode: ModePlan;
}): PlanPosts {
  const { modeles, existants, champs, variables, contexte, mode } = args;
  const plan: PlanPosts = { aCreer: [], aModifier: [] };

  for (const modele of modeles) {
    if (!modeleSApplique(modele, champs.home)) continue;
    const existant = existants.find((p) => p.modeleId === modele.id);

    if (!existant) {
      plan.aCreer.push({ modeleId: modele.id, data: champsDuPost(modele, champs, variables, contexte) });
      continue;
    }
    if (mode === "completer") continue;

    const textes = textesDuPost(modele, variables);
    const date = dateDuPost(champs.starts_at, modele);
    const data: Record<string, unknown> = {};

    if (mode === "reinitialiser") {
      // Un post publie est acquis ; tout autre repart du modele, y compris
      // un post annule a la main, puisque c'est ce que l'option annonce.
      if (existant.statut === "published") continue;
      data.starts_at = date;
      data.title = textes.title;
      data.caption = textes.caption;
      data.description = textes.description;
      data.status = "to_create";
      data.cancelled = false;
      data.date_edited_manually = false;
      data.caption_edited_manually = false;
      plan.aModifier.push({ id: existant.id, data });
      continue;
    }

    // Mode synchro : la date suit le match sauf si elle a ete deplacee a la
    // main, ou si le post est publie ou annule.
    if (!existant.dateModifieeManuellement && !FIGE.includes(existant.statut) && existant.debut !== date) {
      data.starts_at = date;
    }
    // Les textes suivent le match (score connu, salle changee) sauf si la
    // legende a ete retouchee a la main.
    if (!existant.legendeModifieeManuellement) {
      if (existant.titre !== textes.title) data.title = textes.title;
      if ((existant.legende || null) !== textes.caption) data.caption = textes.caption;
      if (JSON.stringify(existant.description ?? null) !== JSON.stringify(textes.description ?? null)) {
        data.description = textes.description;
      }
    }
    if (Object.keys(data).length > 0) plan.aModifier.push({ id: existant.id, data });
  }

  return plan;
}
