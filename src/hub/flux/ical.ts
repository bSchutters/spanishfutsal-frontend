import ical, {
  ICalAlarmType,
  ICalEventRepeatingFreq,
  ICalEventStatus,
  ICalWeekday,
  type ICalAlarmData,
  type ICalRepeatingOptions,
} from "ical-generator";
import { endOfDay } from "date-fns";

import { LIBELLES_STATUT, type Statut } from "@/hub/calendrier/schema";
import { enLocal, formaterHeure, FUSEAU } from "@/hub/dates";
import { estRecurrent, type Recurrence } from "@/hub/recurrence";

/**
 * La construction d'un flux iCal a partir des evenements d'un flux. Rien
 * ici ne lit la base : tout arrive en parametre, ce qui rend le contenu
 * verifiable a sec. Les notes internes n'entrent jamais dans ce fichier,
 * quel que soit le flux : elles ne font pas partie du type d'entree.
 */

export type OptionsFlux = {
  show_meeting_time?: boolean | null;
  show_responsibles?: boolean | null;
  show_status?: boolean | null;
  show_networks_format?: boolean | null;
  show_caption?: boolean | null;
  show_visuals_link?: boolean | null;
  show_hub_link?: boolean | null;
};

export type FluxIcal = {
  name: string;
  slug: string;
  emoji?: string | null;
  alarms: boolean;
  options: OptionsFlux;
};

export type EvenementIcal = {
  id: number;
  titre: string;
  debut: string;
  fin: string | null;
  journeeEntiere: boolean;
  annule: boolean;
  pasDeRappel: boolean;
  categorie: "post" | "match" | "training" | "other";
  statut: Statut | null;
  reseaux: string[];
  format: string | null;
  lieuNom: string | null;
  lieuAdresse: string | null;
  heureRdv: string | null;
  description: string;
  responsables: string[];
  legende: string;
  lienVisuels: string;
  recurrence: Recurrence | null;
  creeLe: string;
  modifieLe: string;
};

export type ReglagesIcal = {
  heureRappelMatin: string;
  delaiRappelAvantMinutes: number;
};

const JOURS_ICAL: Record<string, ICalWeekday> = {
  mon: ICalWeekday.MO,
  tue: ICalWeekday.TU,
  wed: ICalWeekday.WE,
  thu: ICalWeekday.TH,
  fri: ICalWeekday.FR,
  sat: ICalWeekday.SA,
  sun: ICalWeekday.SU,
};

export const DOMAINE_UID = "udasturiana.be";

/** L'identifiant stable d'un evenement dans un flux : un deplacement le met a jour au lieu de le dupliquer. */
export function uidDe(evenementId: number, slugFlux: string): string {
  return `${evenementId}-${slugFlux}@${DOMAINE_UID}`;
}

/** « Matchs UDA », « Social UDA » : le nom que le telephone affiche. */
export function nomCalendrier(flux: FluxIcal): string {
  return `${flux.name} UDA`;
}

export function titreDe(ev: EvenementIcal, flux: FluxIcal): string {
  const morceaux: string[] = [];
  if (flux.emoji?.trim()) morceaux.push(flux.emoji.trim());
  if (ev.annule) morceaux.push("❌ ANNULÉ");
  // Pour un post, le statut et le format en toutes lettres devant le titre :
  // « À créer · Reel · Annonce vs POH ». Bryan a prefere le texte aux emoji.
  if (ev.categorie === "post") {
    if (flux.options.show_status && ev.statut) morceaux.push(`${LIBELLES_STATUT[ev.statut]} ·`);
    if (flux.options.show_networks_format && ev.format) morceaux.push(`${ev.format} ·`);
  }
  morceaux.push(ev.titre);
  return morceaux.join(" ");
}

export function descriptionDe(ev: EvenementIcal, flux: FluxIcal, baseUrl: string): string {
  const o = flux.options;
  const lignes: string[] = [];
  if (o.show_meeting_time && ev.heureRdv) lignes.push(`RDV : ${formaterHeure(ev.heureRdv)}`);
  if (ev.description.trim()) lignes.push(ev.description.trim());
  if (ev.categorie === "post") {
    if (o.show_networks_format && (ev.reseaux.length > 0 || ev.format)) {
      lignes.push([ev.reseaux.join(", "), ev.format].filter(Boolean).join(" · "));
    }
    if (o.show_status && ev.statut) lignes.push(`Statut : ${LIBELLES_STATUT[ev.statut]}`);
  }
  if (o.show_responsibles && ev.responsables.length > 0) lignes.push(`Responsables : ${ev.responsables.join(", ")}`);
  if (ev.categorie === "post") {
    if (o.show_visuals_link && ev.lienVisuels) lignes.push(`Visuels : ${ev.lienVisuels}`);
    if (o.show_caption && ev.legende.trim()) lignes.push(`Légende :\n${ev.legende.trim()}`);
  }
  if (o.show_hub_link) lignes.push(`${baseUrl}/hub/calendrier/evenements/${ev.id}`);
  return lignes.join("\n\n");
}

/**
 * Les alertes d'un evenement : le matin a l'heure du rappel, et un peu avant
 * le debut. Exprimees en secondes avant le debut, elles valent pour chaque
 * occurrence d'une recurrence, ce qu'une heure absolue ne permettrait pas.
 */
export function alarmesDe(ev: EvenementIcal, flux: FluxIcal, reglages: ReglagesIcal): ICalAlarmData[] {
  if (!flux.alarms || ev.pasDeRappel) return [];
  const debut = enLocal(ev.debut);
  const [h, m] = reglages.heureRappelMatin.split(":").map(Number);
  const matin = enLocal(ev.debut);
  matin.setHours(h, m, 0, 0);
  const secondesAvantMatin = Math.round((debut.getTime() - matin.getTime()) / 1000);

  if (ev.journeeEntiere) {
    // Une journee entiere commence a minuit : le matin est apres le debut.
    return [{ type: ICalAlarmType.display, triggerAfter: (h * 60 + m) * 60, description: ev.titre }];
  }

  const alertes: ICalAlarmData[] = [];
  // Le rappel du matin n'a de sens que si l'evenement commence au moins une heure apres.
  if (secondesAvantMatin >= 3600) {
    alertes.push({ type: ICalAlarmType.display, trigger: secondesAvantMatin, description: ev.titre });
  }
  alertes.push({ type: ICalAlarmType.display, trigger: reglages.delaiRappelAvantMinutes * 60, description: ev.titre });
  return alertes;
}

export function recurrenceDe(recurrence: Recurrence | null): ICalRepeatingOptions | null {
  if (!estRecurrent(recurrence) || !recurrence?.until) return null;
  const options: ICalRepeatingOptions = {
    freq: recurrence.frequency === "weekly" ? ICalEventRepeatingFreq.WEEKLY : ICalEventRepeatingFreq.MONTHLY,
    interval: Math.max(1, Math.floor(recurrence.interval ?? 1)),
    until: new Date(endOfDay(enLocal(recurrence.until)).getTime()),
    startOfWeek: ICalWeekday.MO,
  };
  if (recurrence.frequency === "weekly") {
    const jours = (recurrence.weekdays ?? []).map((j) => JOURS_ICAL[j]).filter(Boolean);
    if (jours.length > 0) options.byDay = jours;
  }
  return options;
}

/** Le numero de version d'un evenement : il grandit a chaque modification. */
export function sequenceDe(ev: EvenementIcal): number {
  const delta = Math.floor((new Date(ev.modifieLe).getTime() - new Date(ev.creeLe).getTime()) / 1000);
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

export function construireIcs({
  flux,
  evenements,
  reglages,
  baseUrl,
}: {
  flux: FluxIcal;
  evenements: EvenementIcal[];
  reglages: ReglagesIcal;
  baseUrl: string;
}): string {
  const calendrier = ical({
    name: nomCalendrier(flux),
    prodId: { company: "UD Asturiana", product: "Hub", language: "FR" },
    timezone: FUSEAU,
    ttl: 300,
  });

  for (const ev of evenements) {
    const debut = new Date(ev.debut);
    const fin = ev.fin ? new Date(ev.fin) : null;
    const lieu = [ev.lieuNom, ev.lieuAdresse].filter((v) => v && v.trim()).join(", ");
    calendrier.createEvent({
      id: uidDe(ev.id, flux.slug),
      start: debut,
      end: fin ?? undefined,
      allDay: ev.journeeEntiere,
      timezone: FUSEAU,
      summary: titreDe(ev, flux),
      description: descriptionDe(ev, flux, baseUrl) || undefined,
      location: lieu || undefined,
      status: ev.annule ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
      sequence: sequenceDe(ev),
      lastModified: new Date(ev.modifieLe),
      created: new Date(ev.creeLe),
      repeating: recurrenceDe(ev.recurrence) ?? undefined,
      alarms: alarmesDe(ev, flux, reglages),
    });
  }

  return calendrier.toString();
}
