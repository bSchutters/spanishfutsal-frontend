/**
 * L'heure du coup d'envoi, et la fenetre autour de lui.
 *
 * Partage par la route qui detecte le direct et par celle qui compte les
 * spectateurs : les deux doivent s'accorder au signe pres sur ce qu'est une
 * rencontre en cours, faute de quoi l'une accepterait des battements que l'autre
 * declare hors sujet.
 */

// Un quart d'heure avant le coup d'envoi, et la meme duree de match que sur le
// front pour la fermer.
export const FENETRE_AVANT_MS = 15 * 60 * 1000;
export const FENETRE_APRES_MS = 70 * 60 * 1000;

/**
 * La LFFS donne la date et l'heure en heure belge, sans decalage ecrit. Le
 * navigateur du visiteur les lit donc juste, mais pas la fonction Vercel, qui
 * tourne en UTC : une rencontre de 20h30 y serait placee deux heures trop tot.
 */
function decalageBruxelles(utcMs: number): number {
  const date = new Date(utcMs);
  const local = new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Brussels" }),
  );
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));

  return local.getTime() - utc.getTime();
}

/** L'instant du coup d'envoi, en millisecondes, ou NaN si la fiche est vide. */
export function coupDEnvoi(date: string, time: string): number {
  const naif = Date.parse(`${date}T${time.slice(0, 5)}:00Z`);
  return Number.isNaN(naif) ? NaN : naif - decalageBruxelles(naif);
}

/** La rencontre est-elle dans sa fenetre a cet instant ? */
export function dansLaFenetre(
  match: { date?: string | null; time?: string | null },
  now: number,
): boolean {
  if (!match.date || !match.time) return false;

  const debut = coupDEnvoi(match.date, match.time);
  if (Number.isNaN(debut)) return false;

  return now >= debut - FENETRE_AVANT_MS && now < debut + FENETRE_APRES_MS;
}
