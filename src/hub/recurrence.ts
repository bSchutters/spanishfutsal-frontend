import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, addWeeks, endOfDay, getDate, getDay, startOfWeek } from "date-fns";

import { FUSEAU } from "./dates";

/**
 * La recurrence du Hub, volontairement simple : hebdomadaire ou mensuelle,
 * tous les N, jusqu'a une date. Pas d'exception, pas d'occurrence modifiee a
 * part : on modifie toujours la serie. L'expansion se fait ici, cote
 * serveur, pour l'affichage comme pour les rappels, et la meme regle est
 * ecrite en RRULE dans les flux.
 */

export type Frequence = "none" | "weekly" | "monthly";

export type Recurrence = {
  frequency?: Frequence | null;
  interval?: number | null;
  weekdays?: string[] | null;
  until?: string | null;
};

export type Occurrence = { debut: Date; fin: Date | null };

const JOURS: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };

/** Garde-fou : jamais plus d'occurrences que cela, quelle que soit la borne. */
const MAX_OCCURRENCES = 600;

export function estRecurrent(recurrence: Recurrence | null | undefined): boolean {
  return !!recurrence && (recurrence.frequency === "weekly" || recurrence.frequency === "monthly");
}

function seChevauchent(debut: Date, fin: Date | null, plage: { debut: Date; fin: Date }): boolean {
  const finReelle = fin ?? debut;
  return debut.getTime() <= plage.fin.getTime() && finReelle.getTime() >= plage.debut.getTime();
}

/**
 * Les occurrences d'un evenement dans une plage. Un evenement sans
 * recurrence en a une au plus. Les heures de chaque occurrence sont celles
 * de l'evenement d'origine, en heure de Bruxelles, ce qui traverse les
 * changements d'heure sans decaler la seance.
 */
export function occurrences(
  evenement: { starts_at: string; ends_at?: string | null; recurrence?: Recurrence | null },
  plage: { debut: Date; fin: Date },
  fuseau = FUSEAU,
): Occurrence[] {
  const debut = new TZDate(evenement.starts_at, fuseau);
  const duree = evenement.ends_at ? new Date(evenement.ends_at).getTime() - debut.getTime() : null;
  const finDe = (d: Date): Date | null => (duree === null ? null : new Date(d.getTime() + duree));
  const recurrence = evenement.recurrence;

  if (!estRecurrent(recurrence) || !recurrence?.until) {
    const fin = finDe(debut);
    return seChevauchent(debut, fin, plage) ? [{ debut: new Date(debut.getTime()), fin }] : [];
  }

  const limite = new Date(Math.min(endOfDay(new TZDate(recurrence.until, fuseau)).getTime(), plage.fin.getTime()));
  const intervalle = Math.max(1, Math.floor(recurrence.interval ?? 1));
  const resultat: Occurrence[] = [];
  const ajouter = (d: TZDate) => {
    const fin = finDe(d);
    if (d.getTime() >= debut.getTime() && d.getTime() <= limite.getTime() && seChevauchent(d, fin, plage)) {
      resultat.push({ debut: new Date(d.getTime()), fin });
    }
  };

  if (recurrence.frequency === "weekly") {
    const jours = (recurrence.weekdays ?? [])
      .map((j) => JOURS[j])
      .filter((j): j is number => j !== undefined);
    const joursRetenus = jours.length > 0 ? jours : [getDay(debut)];
    let semaine = startOfWeek(debut, { weekStartsOn: 1 });
    let tours = 0;
    while (semaine.getTime() <= limite.getTime() && tours < MAX_OCCURRENCES) {
      for (const jour of joursRetenus) {
        // Lundi = 0 jour apres le debut de semaine, dimanche = 6.
        const decalage = (jour + 6) % 7;
        const d = new TZDate(addDays(semaine, decalage), fuseau);
        d.setHours(debut.getHours(), debut.getMinutes(), 0, 0);
        ajouter(d);
      }
      semaine = addWeeks(semaine, intervalle);
      tours += 1;
    }
  } else {
    let k = 0;
    let d = new TZDate(debut, fuseau);
    while (d.getTime() <= limite.getTime() && k < MAX_OCCURRENCES) {
      // Un 31 n'existe pas chaque mois : date-fns ramene au dernier jour, on
      // saute ces mois-la plutot que de tomber sur un autre jour.
      if (getDate(d) === getDate(debut)) ajouter(d);
      k += intervalle;
      d = new TZDate(addMonths(debut, k), fuseau);
    }
  }

  return resultat;
}
