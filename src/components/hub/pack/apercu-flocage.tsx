"use client";

import localFont from "next/font/local";
import { useEffect, useState } from "react";

import type { CouleursFlocage, DispositionFlocage } from "@/hub/pack/schema";

/**
 * La police du flocage du club, Tanker (Indian Type Foundry, distribuee
 * librement par Fontshare). Chargee seulement la ou l'apercu s'affiche.
 */
const tanker = localFont({
  src: "../../../../public/assets/fonts/tanker/Tanker-Regular.otf",
  display: "swap",
  preload: false,
});

/** La hauteur des capitales et des chiffres de Tanker, en em. */
const HAUTEUR_CAPITALE = 0.75;

/**
 * Les deux contours, en em, mesures sur le visuel du numero du club : la
 * bande marine visible fait 0,0095 em, la bande jaune exterieure 0,011 em.
 * Un trait SVG deborde de moitie de chaque cote du contour de la lettre :
 * d'ou les doubles.
 */
const TRAIT_CONTOUR = 2 * 0.0095;
const TRAIT_EXTERIEUR = 2 * (0.0095 + 0.011);

/** Le logo du club dans le bas du numero : 10 % de sa hauteur, son centre a 9 % du bas. */
const LOGO_DIAMETRE = 0.103;
const LOGO_CENTRE_DEPUIS_LE_BAS = 0.089;

const LOGO = "/assets/images/svg/logo-asturiana.svg";

/**
 * La largeur du numero (en em) et l'endroit du logo : au centre de l'encre
 * du bas du dernier chiffre, en fraction de cette largeur. Mesure dans un
 * canevas une fois la police chargee ; avant cela, une estimation.
 */
function useMesureDuNumero(numero: string): { largeurEm: number; centre: number } {
  const [mesure, setMesure] = useState({ largeurEm: numero.length * 0.5, centre: 0.5 });

  useEffect(() => {
    if (!numero) return;
    let annule = false;
    const taille = 200;
    const famille = tanker.style.fontFamily;
    void document.fonts.load(`${taille}px ${famille}`, numero).then(() => {
      if (annule) return;
      const toile = document.createElement("canvas");
      const ctx = toile.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.font = `${taille}px ${famille}`;
      const largeur = Math.ceil(ctx.measureText(numero).width);
      const debutDernier = ctx.measureText(numero.slice(0, -1)).width;
      toile.width = largeur + 4;
      toile.height = taille;
      ctx.font = `${taille}px ${famille}`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(numero, 0, taille * 0.9);
      const { data } = ctx.getImageData(0, 0, toile.width, toile.height);
      const encre = (x: number, y: number) => data[(y * toile.width + x) * 4 + 3] > 128;
      // Le bas de l'encre du dernier chiffre, puis le milieu de sa bande basse.
      let bas = -1;
      for (let y = toile.height - 1; y >= 0 && bas < 0; y--) {
        for (let x = Math.floor(debutDernier); x < toile.width; x++) if (encre(x, y)) { bas = y; break; }
      }
      if (bas < 0) return;
      const bande = Math.round(taille * HAUTEUR_CAPITALE * 0.15);
      let gauche = Infinity;
      let droite = -Infinity;
      for (let y = bas; y > bas - bande; y--) {
        for (let x = Math.floor(debutDernier); x < toile.width; x++) {
          if (encre(x, y)) {
            gauche = Math.min(gauche, x);
            droite = Math.max(droite, x);
          }
        }
      }
      if (Number.isFinite(gauche)) setMesure({ largeurEm: largeur / taille, centre: (gauche + droite) / 2 / largeur });
    });
    return () => {
      annule = true;
    };
  }, [numero]);

  return mesure;
}

/** Un texte en trois couches : contour exterieur, contour, puis la lettre. */
function TexteFloque({ texte, x, y, taille, couleurs, espacement = 0 }: { texte: string; x: number; y: number; taille: number; couleurs: CouleursFlocage; espacement?: number }) {
  const commun = { x, y, fontSize: taille, textAnchor: "middle" as const, letterSpacing: espacement * taille };
  return (
    <>
      <text {...commun} fill={couleurs.exterieur} stroke={couleurs.exterieur} strokeWidth={TRAIT_EXTERIEUR * taille} strokeLinejoin="round">
        {texte}
      </text>
      <text {...commun} fill={couleurs.contour} stroke={couleurs.contour} strokeWidth={TRAIT_CONTOUR * taille} strokeLinejoin="round">
        {texte}
      </text>
      <text {...commun} fill={couleurs.remplissage}>
        {texte}
      </text>
    </>
  );
}

/**
 * L'apercu du flocage, pose sur la photo de dos (carree) : le nom, puis le
 * numero et le logo du club dans son bas. Coordonnees sur 1000, comme les
 * pourcentages de la disposition multiplies par dix.
 */
export default function ApercuFlocage({
  numero,
  nom,
  couleurs,
  disposition,
}: {
  numero: string;
  nom: string;
  couleurs: CouleursFlocage;
  disposition: DispositionFlocage;
}) {
  const mesure = useMesureDuNumero(numero);
  if (!numero && !nom) return null;

  const tailleNom = (disposition.nomHauteur * 10) / HAUTEUR_CAPITALE;
  const tailleNumero = (disposition.numeroHauteur * 10) / HAUTEUR_CAPITALE;
  // La ligne de base est sous le centre vertical, d'une demi-capitale.
  const baseNom = disposition.nomY * 10 + (disposition.nomHauteur * 10) / 2;
  const baseNumero = disposition.numeroY * 10 + (disposition.numeroHauteur * 10) / 2;

  const largeurNumero = mesure.largeurEm * tailleNumero;
  const logo = LOGO_DIAMETRE * disposition.numeroHauteur * 10;
  const logoX = 500 - largeurNumero / 2 + mesure.centre * largeurNumero;
  const logoY = baseNumero - LOGO_CENTRE_DEPUIS_LE_BAS * disposition.numeroHauteur * 10;

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="pointer-events-none absolute inset-0 size-full"
      style={{ fontFamily: tanker.style.fontFamily }}
      aria-hidden="true"
    >
      {nom ? <TexteFloque texte={nom} x={500} y={baseNom} taille={tailleNom} couleurs={couleurs} espacement={0.03} /> : null}
      {numero ? (
        <>
          <TexteFloque texte={numero} x={500} y={baseNumero} taille={tailleNumero} couleurs={couleurs} />
          <image href={LOGO} x={logoX - logo / 2} y={logoY - logo / 2} width={logo} height={logo} />
        </>
      ) : null}
    </svg>
  );
}
