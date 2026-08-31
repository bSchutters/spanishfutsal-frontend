/**
 * Adresse de reference du site, celle qui repond 200 et que Google doit
 * retenir. Elle etait recopiee a la main dans dix-neuf endroits : canoniques,
 * OpenGraph, sitemap, robots et donnees structurees. Une seule d'entre elles
 * oubliee et le moteur voit deux versions de la meme page.
 *
 * Le domaine nu et le domaine www doivent pointer sur celui-ci par une
 * redirection permanente, sans quoi les deux restent dans l'index.
 */
export const SITE_URL = "https://www.udasturiana.be";

/** Construit une adresse absolue a partir d'un chemin (« /contact »). */
export function siteUrl(path = ""): string {
  return path ? `${SITE_URL}${path}` : SITE_URL;
}
