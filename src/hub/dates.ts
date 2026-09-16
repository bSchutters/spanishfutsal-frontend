import { TZDate } from "@date-fns/tz";
import { differenceInMinutes, format, isValid } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Tout calcul de fuseau du Hub passe par ici. Les dates sont stockees en UTC
 * et lues, affichees et saisies dans le fuseau du club : une rencontre a
 * 22h00 reste a 22h00 quel que soit le serveur, Vercel tournant en UTC.
 */
export const FUSEAU = "Europe/Brussels";

export type DateEntree = Date | string | number;

/** La meme date, vue depuis Bruxelles. */
export function enLocal(date: DateEntree, fuseau = FUSEAU): TZDate {
  if (typeof date === "string") return new TZDate(date, fuseau);
  if (typeof date === "number") return new TZDate(date, fuseau);
  return new TZDate(date, fuseau);
}

/** « mercredi 16 septembre 2026 » */
export function formaterDate(date: DateEntree, fuseau = FUSEAU): string {
  return format(enLocal(date, fuseau), "EEEE d MMMM yyyy", { locale: fr });
}

/** « mercredi 16 septembre », la forme des legendes generees. */
export function formaterDateSansAnnee(date: DateEntree, fuseau = FUSEAU): string {
  return format(enLocal(date, fuseau), "EEEE d MMMM", { locale: fr });
}

/** « mer. 16 sept. » */
export function formaterDateCourte(date: DateEntree, fuseau = FUSEAU): string {
  return format(enLocal(date, fuseau), "EEE d MMM", { locale: fr });
}

/** « 22h00 », la convention du club. */
export function formaterHeure(date: DateEntree, fuseau = FUSEAU): string {
  return format(enLocal(date, fuseau), "HH'h'mm", { locale: fr });
}

/** « mercredi 16 septembre 2026 à 22h00 » */
export function formaterDateHeure(date: DateEntree, fuseau = FUSEAU): string {
  return `${formaterDate(date, fuseau)} à ${formaterHeure(date, fuseau)}`;
}

/** La valeur d'un champ datetime-local : « 2026-09-16T22:00 », en heure locale. */
export function versChampDateHeure(date: DateEntree | null | undefined, fuseau = FUSEAU): string {
  if (date === null || date === undefined || date === "") return "";
  const locale = enLocal(date, fuseau);
  return isValid(locale) ? format(locale, "yyyy-MM-dd'T'HH:mm") : "";
}

/** La valeur d'un champ date : « 2026-09-16 », en heure locale. */
export function versChampDate(date: DateEntree | null | undefined, fuseau = FUSEAU): string {
  if (date === null || date === undefined || date === "") return "";
  const locale = enLocal(date, fuseau);
  return isValid(locale) ? format(locale, "yyyy-MM-dd") : "";
}

/**
 * Lit un champ datetime-local (« 2026-09-16T22:00 ») comme une heure de
 * Bruxelles et renvoie l'instant UTC en ISO. Renvoie null si illisible.
 */
export function depuisChampDateHeure(valeur: string | null | undefined, fuseau = FUSEAU): string | null {
  if (!valeur) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valeur);
  if (!m) return null;
  const [, a, mo, j, h, mi] = m.map(Number);
  const date = new TZDate(a, mo - 1, j, h, mi, 0, 0, fuseau);
  // TZDate ecrit son ISO avec le decalage local : on veut l'instant en UTC.
  return isValid(date) ? new Date(date.getTime()).toISOString() : null;
}

/** Une date (« 2026-09-16 ») et une heure (« 22:00 ») de Bruxelles, en instant UTC. */
export function composerDateHeure(jour: string, heure: string, fuseau = FUSEAU): Date | null {
  const md = /^(\d{4})-(\d{2})-(\d{2})/.exec(jour);
  const mh = /^(\d{2}):(\d{2})/.exec(heure);
  if (!md || !mh) return null;
  const date = new TZDate(Number(md[1]), Number(md[2]) - 1, Number(md[3]), Number(mh[1]), Number(mh[2]), 0, 0, fuseau);
  return isValid(date) ? new Date(date.getTime()) : null;
}

/**
 * Le meme instant decale de N jours civils a Bruxelles, a la meme heure
 * locale : deux jours avant un match a 22h00 restent a 22h00, meme si le
 * changement d'heure passe entre les deux.
 */
export function ajouterJoursLocaux(date: DateEntree, jours: number, fuseau = FUSEAU): Date {
  const locale = enLocal(date, fuseau);
  const decale = new TZDate(
    locale.getFullYear(),
    locale.getMonth(),
    locale.getDate() + jours,
    locale.getHours(),
    locale.getMinutes(),
    locale.getSeconds(),
    locale.getMilliseconds(),
    fuseau,
  );
  return new Date(decale.getTime());
}

/** La duree entre deux instants, en minutes, ou null sans fin. */
export function dureeMinutes(debut: DateEntree, fin: DateEntree | null | undefined): number | null {
  if (fin === null || fin === undefined || fin === "") return null;
  return differenceInMinutes(new Date(fin), new Date(debut));
}

/** L'instant, en millisecondes, d'une valeur ISO ou d'une date. */
export function instant(date: DateEntree): number {
  return new Date(date).getTime();
}
