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

/**
 * Vignette des partages, celle qui s'affiche sur WhatsApp, Facebook ou dans
 * un resultat Google. Elle vit dans `public` et non dans `app` : chaque page
 * qui declare son propre bloc `openGraph` remplace celui du gabarit, la
 * convention de fichier de Next serait alors perdue sur six pages sur sept.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}/assets/images/og-uda.jpg`,
  width: 1200,
  height: 630,
  alt: "Blason de l'UD Asturiana",
};

/**
 * Carre du blason. C'est ce champ que Google lit pour la vignette d'un
 * resultat de recherche, et il la veut carree : la vignette de partage en
 * 1200x630 ne convient pas pour cet usage.
 */
export const LOGO_URL = `${SITE_URL}/assets/images/blason-uda.jpg`;
