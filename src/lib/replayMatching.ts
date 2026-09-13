import type { Match } from "./getMatchs";
import type { MiseEnLigne } from "./getYoutubeLive";

/**
 * Le rapprochement entre une rencontre et une mise en ligne de la chaine.
 *
 * Ces fonctions ne touchent ni la base ni le reseau : la reconnaissance est une
 * affaire de titres et de dates, et elle se verifie a part. C'est la partie du
 * rattrapage ou une erreur se voit le moins, puisqu'elle produit un lien
 * plausible plutot qu'une panne.
 */

// Au-dela, on ne rattrape plus : une rencontre d'il y a deux mois dont le replay
// manque encore n'a pas ete mise en ligne, et ratisser tout le calendrier a
// chaque passage multiplierait les rapprochements hasardeux.
export const FENETRE_JOURS = 30;

// Delai admis entre la rencontre et sa mise en ligne. Large, parce qu'un montage
// attend parfois le week-end suivant, mais pas infini : c'est ce qui evite
// d'attribuer a un match la video de la meme affiche jouee au tour retour.
const DELAI_MISE_EN_LIGNE_JOURS = 21;

export const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Mots qu'on retrouve dans un nom de club sur deux : les garder ferait
 * reconnaitre n'importe quel adversaire dans n'importe quel titre.
 */
const MOTS_TROP_COMMUNS = new Set([
  "fc",
  "ft",
  "rfc",
  "asbl",
  "club",
  "futsal",
  "foot",
  "football",
  "royal",
  "royale",
  "team",
  "the",
  "les",
  "des",
  "und",
  "van",
  "der",
  "den",
  "sport",
  "sporting",
  "union",
  "academy",
  "boys",
  "city",
  "united",
]);

/** Minuscules, sans accents, ponctuation ramenee a des espaces. */
function reduire(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les mots d'un nom d'equipe qui le distinguent vraiment. On ecarte les mots
 * trop courts, les numeros d'equipe et le vocabulaire commun a tous les clubs.
 */
function motsDistinctifs(nom: string): string[] {
  return reduire(nom)
    .split(" ")
    .filter((mot) => mot.length >= 3 && !MOTS_TROP_COMMUNS.has(mot) && !/^\d+$/.test(mot));
}

/**
 * Les dates ecrites dans un texte, sous les formes qu'on rencontre reellement :
 * 12/09/2026, 12-09-26, 12.09 et leurs variantes. L'annee est facultative, et
 * un titre ne porte jamais la date au format americain dans ce contexte.
 */
function datesEcrites(texte: string): { jour: number; mois: number; annee: number | null }[] {
  const trouvees: { jour: number; mois: number; annee: number | null }[] = [];
  const motif = /(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?/g;

  for (const [, j, m, a] of texte.matchAll(motif)) {
    const jour = Number(j);
    const mois = Number(m);
    if (jour < 1 || jour > 31 || mois < 1 || mois > 12) continue;

    const annee = a ? (a.length === 2 ? 2000 + Number(a) : Number(a)) : null;
    trouvees.push({ jour, mois, annee });
  }

  return trouvees;
}

/** La date de la rencontre est-elle ecrite dans ce texte ? */
function porteLaDate(texte: string, date: string): boolean {
  const [annee, mois, jour] = date.split("-").map(Number);

  return datesEcrites(texte).some(
    (ecrite) =>
      ecrite.jour === jour &&
      ecrite.mois === mois &&
      (ecrite.annee === null || ecrite.annee === annee),
  );
}

/** L'adversaire de la rencontre, c'est-a-dire l'equipe qui n'est pas le club. */
function adversaire(match: Match): string {
  return match.homeIsClub ? match.awayTeam : match.homeTeam;
}

type Candidate = {
  video: MiseEnLigne;
  /** Nombre de mots distinctifs de l'adversaire retrouves dans le titre. */
  mots: number;
  /** La date de la rencontre est ecrite dans le titre. */
  date: boolean;
  /** Jours entre la rencontre et la mise en ligne. */
  delai: number;
};

/**
 * La mise en ligne qui correspond a cette rencontre, ou null.
 *
 * Deux signaux sont exiges ensemble : le nom de l'adversaire, et soit la date
 * ecrite dans le titre, soit une publication dans les semaines qui ont suivi la
 * rencontre. Le nom seul ne suffit pas, sinon l'aller et le retour se
 * disputeraient la meme video.
 */
export function rapprocher(match: Match, videos: MiseEnLigne[]): MiseEnLigne | null {
  const attendus = motsDistinctifs(adversaire(match));
  if (!attendus.length) return null;

  const jourDuMatch = Date.parse(`${match.date}T00:00:00Z`);
  if (Number.isNaN(jourDuMatch)) return null;

  const candidates: Candidate[] = [];

  for (const video of videos) {
    // La description sert d'appui pour le nom, que certains montages ne mettent
    // que la. La date, elle, n'est cherchee que dans le titre : une description
    // en contient souvent plusieurs, dont celle du match suivant.
    const appui = reduire(`${video.title} ${video.description}`);

    const mots = attendus.filter((mot) => appui.includes(mot)).length;
    if (!mots) continue;

    const publiee = Date.parse(video.publishedAt);
    const delai = Number.isNaN(publiee)
      ? Number.POSITIVE_INFINITY
      : Math.round((publiee - jourDuMatch) / JOUR_MS);

    // Sur le titre brut, et non reduit : la reduction remplace la ponctuation
    // par des espaces, et « 12.09.26 » perdait ses separateurs avant d'etre lu.
    const date = porteLaDate(video.title, match.date);
    const dansLesTemps = delai >= 0 && delai <= DELAI_MISE_EN_LIGNE_JOURS;

    if (!date && !dansLesTemps) continue;

    candidates.push({ video, mots, date, delai });
  }

  if (!candidates.length) return null;

  // La date ecrite l'emporte sur tout, puis le nombre de mots reconnus, puis la
  // video la plus proche de la rencontre.
  candidates.sort(
    (a, b) =>
      Number(b.date) - Number(a.date) || b.mots - a.mots || a.delai - b.delai,
  );

  return candidates[0].video;
}
