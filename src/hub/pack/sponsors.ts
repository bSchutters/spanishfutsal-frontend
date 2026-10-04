/**
 * Les sponsors du club sur le dos des maillots : Sofexia au-dessus du numero,
 * Wabee en dessous. Le club les fournit en trois versions (dossier
 * c_FLOCAGES/Sponsors) : jaunes pour le maillot marine, marine pour le maillot
 * jaune, noirs pour le gardien a l'exterieur. La version suit la couleur des
 * lettres du flocage, comme sur les maillots du club.
 */
export const VERSIONS_SPONSORS = [
  { cle: "dom", couleur: "#ffd600" },
  { cle: "ext", couleur: "#243354" },
  { cle: "gk-ext", couleur: "#1e1e1e" },
] as const;

export type VersionSponsors = (typeof VERSIONS_SPONSORS)[number]["cle"];

/** Le nom du fichier sans sa version, et le rapport largeur sur hauteur du dessin. */
export type Sponsor = { nom: string; fichier: string; ratio: number };

export const SPONSORS: { haut: Sponsor; bas: Sponsor } = {
  haut: { nom: "Sofexia", fichier: "sofexia", ratio: 680.31 / 103.21 },
  bas: { nom: "Wabee", fichier: "wabee", ratio: 680.31 / 157.72 },
};

const rvb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** La version dont la couleur est la plus proche de celle des lettres du flocage. */
export function versionSponsors(remplissage: string): VersionSponsors {
  const [r, v, b] = rvb(remplissage);
  let choisie: VersionSponsors = VERSIONS_SPONSORS[0].cle;
  let ecart = Infinity;
  for (const version of VERSIONS_SPONSORS) {
    const [r2, v2, b2] = rvb(version.couleur);
    const distance = (r - r2) ** 2 + (v - v2) ** 2 + (b - b2) ** 2;
    if (distance < ecart) {
      ecart = distance;
      choisie = version.cle;
    }
  }
  return choisie;
}

/** L'adresse du dessin d'un sponsor dans une version : public/assets/images/flocage. */
export const imageSponsor = (sponsor: Sponsor, version: VersionSponsors) => `/assets/images/flocage/${sponsor.fichier}-${version}.svg`;
