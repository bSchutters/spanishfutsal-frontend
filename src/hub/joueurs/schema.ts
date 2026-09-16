import * as z from "zod/mini";

z.config({ jitless: true });

/**
 * Les regles pures du module Joueurs : la saisie d'une feuille de stats, la
 * saisie des numeros, et les conversions entre la feuille du Hub et les deux
 * tableaux de la collection Matchs (`field_players_stats`, `goalkeeper_stats`),
 * que le site public lit tels quels. Partage entre les formulaires, les
 * actions et les tests.
 */

export type Poste = "Gardien" | "Joueur" | "Coach" | "Kine";

/** Seuls les gardiens et les joueurs de champ figurent sur une feuille. */
export function surLaFeuille(poste: Poste | null | undefined): boolean {
  return poste === "Gardien" || poste === "Joueur";
}

const identifiant = z.number().check(z.int(), z.positive());
const compteur = (max: number, quoi: string) =>
  z.number().check(z.int(), z.gte(0, `${quoi} : pas de valeur négative.`), z.lte(max, `${quoi} : ${max} au plus.`));

/** Une ligne de la feuille : un joueur qui a joue, et ce qu'il a fait. */
export const schemaLigneStats = z.object({
  joueurId: identifiant,
  buts: compteur(30, "Buts"),
  assists: compteur(30, "Assists"),
  jaunes: compteur(2, "Cartons jaunes"),
  rouges: compteur(1, "Cartons rouges"),
  cleanSheet: z.boolean(),
});

export type LigneStats = z.infer<typeof schemaLigneStats>;

export const schemaFeuilleStats = z.object({
  matchId: identifiant,
  lignes: z.array(schemaLigneStats).check(z.maxLength(40, "Trop de lignes.")),
});

export type SaisieFeuilleStats = z.infer<typeof schemaFeuilleStats>;

/**
 * Les maillots du club : du 2 au 14 pour les joueurs de champ, treize
 * numeros ; le 1 et le 21 pour les gardiens. Rien d'autre.
 */
export const NUMERO_MIN = 2;
export const NUMERO_MAX = 14;
export const NUMEROS_CHAMP: readonly number[] = Array.from({ length: NUMERO_MAX - NUMERO_MIN + 1 }, (_, i) => NUMERO_MIN + i);
export const NUMEROS_GARDIENS: readonly number[] = [1, 21];
export const MESSAGE_PLAGE = `Un numéro de ${NUMERO_MIN} à ${NUMERO_MAX}, ceux des maillots.`;
export const MESSAGE_PLAGE_GARDIEN = `Un gardien porte le ${NUMEROS_GARDIENS.join(" ou le ")}.`;

/** Vrai si ce numero existe sur un maillot du club, pour ce poste. */
export function numeroDeMaillot(numero: number, gardien: boolean): boolean {
  if (!Number.isInteger(numero)) return false;
  return gardien ? NUMEROS_GARDIENS.includes(numero) : numero >= NUMERO_MIN && numero <= NUMERO_MAX;
}

/** Vrai si ce numero existe sur un maillot du club, gardien ou champ. */
export function numeroConnu(numero: number): boolean {
  return numeroDeMaillot(numero, false) || numeroDeMaillot(numero, true);
}

export const messagePlage = (gardien: boolean) => (gardien ? MESSAGE_PLAGE_GARDIEN : MESSAGE_PLAGE);

/** Une ligne telle que la collection Matchs la stocke. */
export type LigneMatch = {
  joueur: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheet?: boolean;
};

export type TableauxMatch = { field_players_stats: LigneMatch[]; goalkeeper_stats: LigneMatch[] };

/**
 * La feuille du Hub vers les deux tableaux de la collection : un gardien va
 * dans les stats gardiens avec sa clean sheet, un joueur de champ dans les
 * stats joueurs, sans. Un joueur inconnu ou hors feuille est ignore, et un
 * joueur ne figure qu'une fois. L'ordre suit celui de la feuille.
 */
export function versTableauxMatch(lignes: readonly LigneStats[], postes: ReadonlyMap<number, Poste | null>): TableauxMatch {
  const resultat: TableauxMatch = { field_players_stats: [], goalkeeper_stats: [] };
  const vus = new Set<number>();
  for (const ligne of lignes) {
    if (vus.has(ligne.joueurId) || !postes.has(ligne.joueurId)) continue;
    const poste = postes.get(ligne.joueurId) ?? "Joueur";
    if (!surLaFeuille(poste)) continue;
    vus.add(ligne.joueurId);
    const commun = { joueur: ligne.joueurId, goals: ligne.buts, assists: ligne.assists, yellow_cards: ligne.jaunes, red_cards: ligne.rouges };
    if (poste === "Gardien") resultat.goalkeeper_stats.push({ ...commun, clean_sheet: ligne.cleanSheet });
    else resultat.field_players_stats.push(commun);
  }
  return resultat;
}

type LigneBrute = {
  joueur?: unknown;
  goals?: unknown;
  assists?: unknown;
  yellow_cards?: unknown;
  red_cards?: unknown;
  clean_sheet?: unknown;
};

const idDeRelation = (relation: unknown): number | null => {
  const brut = typeof relation === "object" && relation !== null ? (relation as { id?: unknown }).id : relation;
  const id = Number(brut);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const entier = (valeur: unknown): number => (typeof valeur === "number" && Number.isFinite(valeur) ? Math.max(0, Math.trunc(valeur)) : 0);

/**
 * Les deux tableaux de la collection vers les lignes de la feuille, tels
 * qu'ils sont, relations peuplees ou non. Une ligne sans joueur est ignoree.
 */
export function depuisTableauxMatch(match: Record<string, unknown>): LigneStats[] {
  const lignes: LigneStats[] = [];
  const lire = (brut: unknown, gardien: boolean) => {
    if (!Array.isArray(brut)) return;
    for (const ligne of brut as LigneBrute[]) {
      const joueurId = idDeRelation(ligne.joueur);
      if (joueurId === null) continue;
      lignes.push({
        joueurId,
        buts: entier(ligne.goals),
        assists: entier(ligne.assists),
        jaunes: entier(ligne.yellow_cards),
        rouges: entier(ligne.red_cards),
        cleanSheet: gardien && ligne.clean_sheet === true,
      });
    }
  };
  lire(match.goalkeeper_stats, true);
  lire(match.field_players_stats, false);
  return lignes;
}

/** Le total des buts saisis, a comparer au score du club. */
export function butsSaisis(lignes: readonly Pick<LigneStats, "buts">[]): number {
  return lignes.reduce((total, ligne) => total + ligne.buts, 0);
}

/**
 * Le message quand la feuille et le score ne racontent pas la meme chose.
 * Rien tant que le score manque : un match futur n'a pas de score. Un ecart
 * n'empeche pas d'enregistrer, un but contre son camp adverse n'a pas
 * d'auteur chez nous.
 */
export function ecartAvecLeScore(lignes: readonly Pick<LigneStats, "buts">[], butsClub: number | null): string | null {
  if (butsClub === null) return null;
  const saisis = butsSaisis(lignes);
  if (saisis === butsClub) return null;
  if (saisis < butsClub) {
    const manque = butsClub - saisis;
    return `Il manque ${manque} but${manque > 1 ? "s" : ""} par rapport au score (${butsClub}).`;
  }
  const trop = saisis - butsClub;
  return `${trop} but${trop > 1 ? "s" : ""} de trop par rapport au score (${butsClub}).`;
}

export type EtatSaisie = "a_saisir" | "saisie" | "a_venir";

/**
 * Ou en est un match : a venir tant qu'il n'a pas de score, saisi des qu'il
 * porte une ligne de stats, a saisir sinon. Un match sans score mais deja
 * passe reste « a venir » : le score arrive par l'import, la feuille se
 * remplit apres.
 */
export function etatSaisie(match: { score: string | null; nbLignes: number }): EtatSaisie {
  if (match.nbLignes > 0) return "saisie";
  return match.score === null ? "a_venir" : "a_saisir";
}

export const LIBELLES_ETAT_SAISIE: Record<EtatSaisie, string> = {
  a_saisir: "À saisir",
  saisie: "Saisie",
  a_venir: "À venir",
};

export const COULEURS_ETAT_SAISIE: Record<EtatSaisie, string> = {
  a_saisir: "#f2c14e",
  saisie: "#7bd389",
  a_venir: "#9fb3c9",
};

/** Les buts du club dans un score « 3 - 1 », selon le camp. Null sans score. */
export function butsDuClub(score: string | null, domicile: boolean): number | null {
  if (!score) return null;
  const lu = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(score);
  if (!lu) return null;
  return Number(domicile ? lu[1] : lu[2]);
}

export type JoueurNumeros = {
  id: number;
  prenom: string;
  nom: string;
  gardien: boolean;
  numeroFeuille1: number | null;
  numeroFeuille2: number | null;
};

/** Deux porteurs par numero : un principal, un secondaire. */
export const PORTEURS_MAX = 2;

export type PlaceNumero<T> = { numero: number; joueurs: T[]; placesLibres: number; maillot: boolean; gardien: boolean };

/**
 * Qui peut porter quel numero, sur les maillots du club, gardiens compris. Chaque numero se
 * donne a deux joueurs au plus, l'un en principal, l'autre en secondaire :
 * les places libres disent ou caser les suivants. Un numero saisi hors
 * des maillots, un reste d'avant la regle, apparait quand meme, signale,
 * pour etre corrige. Numeros croissants, joueurs dans l'ordre recu.
 */
export function joueursParNumero<T extends JoueurNumeros>(joueurs: readonly T[]): Array<PlaceNumero<T>> {
  const parNumero = new Map<number, T[]>([...NUMEROS_GARDIENS, ...NUMEROS_CHAMP].map((n) => [n, []]));
  for (const joueur of joueurs) {
    // Un joueur qui a deux fois le meme numero n'y figure qu'une fois.
    const siens = new Set([joueur.numeroFeuille1, joueur.numeroFeuille2].filter((n): n is number => n !== null));
    for (const n of siens) parNumero.set(n, [...(parNumero.get(n) ?? []), joueur]);
  }
  return [...parNumero]
    .sort(([a], [b]) => a - b)
    .map(([numero, liste]) => ({
      numero,
      joueurs: liste,
      placesLibres: Math.max(0, PORTEURS_MAX - liste.length),
      maillot: numeroConnu(numero),
      gardien: numeroDeMaillot(numero, true),
    }));
}

export type ChampNumero = "numeroFeuille1" | "numeroFeuille2";

/** Les autres joueurs qui portent ce numero, en premier ou en second. */
export function porteursDe<T extends JoueurNumeros>(joueurs: readonly T[], numero: number, saufId: number): T[] {
  return joueurs.filter((j) => j.id !== saufId && (j.numeroFeuille1 === numero || j.numeroFeuille2 === numero));
}

const nomCourt = (j: JoueurNumeros) => `${j.prenom} ${j.nom}`.trim();

/**
 * Pourquoi un numero ne peut pas etre donne a ce joueur, ou null s'il le
 * peut. Un numero se porte au plus par deux joueurs, l'un en principal,
 * l'autre en secondaire, pour tourner sans se retrouver a trois sur le
 * meme maillot ; un joueur ne le prend pas deux fois ; et chacun reste
 * dans les maillots de son poste. Rien ne se verifie pour une case videe.
 */
export function refusNumero(
  joueurs: readonly JoueurNumeros[],
  joueurId: number,
  champ: ChampNumero,
  numero: number | null,
): string | null {
  if (numero === null) return null;
  const moi = joueurs.find((j) => j.id === joueurId);
  const autreChamp: ChampNumero = champ === "numeroFeuille1" ? "numeroFeuille2" : "numeroFeuille1";
  if (moi && moi[autreChamp] === numero) return `Ce joueur a déjà le ${numero}.`;
  if (!numeroDeMaillot(numero, moi?.gardien ?? false)) return messagePlage(moi?.gardien ?? false);
  const porteurs = porteursDe(joueurs, numero, joueurId);
  if (porteurs.length >= PORTEURS_MAX) {
    return `Le ${numero} est déjà porté par deux joueurs, ${porteurs.map(nomCourt).join(" et ")}.`;
  }
  return null;
}

/**
 * Par numero principal, puis secondaire, les sans numero en fin, et a
 * egalite par nom : l'ordre de la feuille de match, celui que Bryan a
 * demande. Ne modifie pas la liste recue.
 */
export function trierJoueurs<T extends { nom: string; prenom: string; numeroFeuille1: number | null; numeroFeuille2: number | null }>(
  joueurs: readonly T[],
): T[] {
  const rang = (n: number | null) => n ?? Number.MAX_SAFE_INTEGER;
  return [...joueurs].sort(
    (a, b) =>
      rang(a.numeroFeuille1) - rang(b.numeroFeuille1) ||
      rang(a.numeroFeuille2) - rang(b.numeroFeuille2) ||
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
  );
}
