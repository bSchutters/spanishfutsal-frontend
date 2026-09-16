import { SITE_URL } from "@/lib/site";

/**
 * L'adresse publique du Hub, celle qui figure dans les liens de flux, les
 * QR codes et les flux eux-memes. HUB_BASE_URL permet de la changer pour un
 * environnement de test ; sans elle, c'est l'adresse du site.
 */
export function baseUrlHub(): string {
  return (process.env.HUB_BASE_URL || SITE_URL).replace(/\/$/, "");
}

export function urlFlux(token: string, base = baseUrlHub()): string {
  return `${base}/api/hub/flux/${encodeURIComponent(token)}.ics`;
}

export function urlAbonnement(token: string, base = baseUrlHub()): string {
  return `${base}/abonnement/${encodeURIComponent(token)}`;
}

/** La meme adresse en webcal://, ce que Calendrier d'Apple attend pour s'abonner. */
export function enWebcal(url: string): string {
  return url.replace(/^https?:\/\//, "webcal://");
}

/** Le lien d'abonnement Google Agenda a une adresse iCal. */
export function lienGoogleAgenda(url: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(enWebcal(url))}`;
}
