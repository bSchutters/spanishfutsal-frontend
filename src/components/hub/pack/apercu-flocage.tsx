"use client";

import localFont from "next/font/local";
import { useEffect, useState } from "react";

import type { CouleursFlocage, DispositionFlocage } from "@/hub/pack/schema";
import { imageSponsor, SPONSORS, versionSponsors, type Sponsor, type VersionSponsors } from "@/hub/pack/sponsors";

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

/** Le logo du club dans le bas de chaque chiffre : 10 % de la hauteur du numero, son centre a 9 % du bas. */
const LOGO_DIAMETRE = 0.103;
const LOGO_CENTRE_DEPUIS_LE_BAS = 0.089;

const LOGO = "/assets/images/svg/logo-asturiana.svg";

/** La largeur du numero et le milieu du bas de chaque chiffre, en em depuis la gauche du numero. */
type Mesure = { numero: string; largeurEm: number; centres: number[] };

/** Avant la mesure : des chiffres d'un demi-em, le logo au milieu de chacun. */
const estimation = (numero: string): Mesure => ({
  numero,
  largeurEm: numero.length * 0.5,
  centres: Array.from(numero, (_, rang) => (rang + 0.5) * 0.5),
});

/**
 * La largeur du numero et, pour chaque chiffre, l'endroit de son logo : le
 * milieu de l'encre du bas du chiffre, comme sur les numeros du club. Mesure
 * chiffre par chiffre dans un canevas une fois la police chargee ; avant cela,
 * une estimation.
 */
function useMesureDuNumero(numero: string): Mesure {
  const [mesure, setMesure] = useState<Mesure | null>(null);

  useEffect(() => {
    if (!numero) return;
    let annule = false;
    const taille = 200;
    const police = `${taille}px ${tanker.style.fontFamily}`;
    void document.fonts.load(police, numero).then(() => {
      if (annule) return;
      const toile = document.createElement("canvas");
      toile.width = taille * 1.5;
      toile.height = taille;
      const ctx = toile.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.font = police;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "alphabetic";
      const marge = Math.round(taille * 0.25);
      const bande = Math.round(taille * HAUTEUR_CAPITALE * 0.15);
      const centres: number[] = [];
      for (let rang = 0; rang < numero.length; rang++) {
        ctx.clearRect(0, 0, toile.width, toile.height);
        ctx.fillText(numero[rang], marge, taille * 0.9);
        const { data } = ctx.getImageData(0, 0, toile.width, toile.height);
        const encre = (x: number, y: number) => data[(y * toile.width + x) * 4 + 3] > 128;
        // Le bas de l'encre du chiffre, puis le milieu de sa bande basse.
        let bas = -1;
        for (let y = toile.height - 1; y >= 0 && bas < 0; y--) {
          for (let x = 0; x < toile.width; x++) {
            if (encre(x, y)) {
              bas = y;
              break;
            }
          }
        }
        let gauche = Infinity;
        let droite = -Infinity;
        for (let y = bas; y > bas - bande && y >= 0; y--) {
          for (let x = 0; x < toile.width; x++) {
            if (encre(x, y)) {
              gauche = Math.min(gauche, x);
              droite = Math.max(droite, x);
            }
          }
        }
        if (!Number.isFinite(gauche)) return;
        const debut = ctx.measureText(numero.slice(0, rang)).width;
        centres.push((debut + (gauche + droite) / 2 - marge) / taille);
      }
      setMesure({ numero, largeurEm: ctx.measureText(numero).width / taille, centres });
    });
    return () => {
      annule = true;
    };
  }, [numero]);

  return mesure?.numero === numero ? mesure : estimation(numero);
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

/** Un sponsor centre sur le dos, a la largeur donnee, sa hauteur suivant son dessin. */
function SponsorDos({ sponsor, version, centreY, largeur }: { sponsor: Sponsor; version: VersionSponsors; centreY: number; largeur: number }) {
  const hauteur = largeur / sponsor.ratio;
  return <image href={imageSponsor(sponsor, version)} x={500 - largeur / 2} y={centreY - hauteur / 2} width={largeur} height={hauteur} />;
}

/**
 * L'apercu du flocage, pose sur la photo de dos (carree) : les sponsors du
 * club s'ils sont prevus, le nom, puis le numero avec le logo du club dans le
 * bas de chaque chiffre. Coordonnees sur 1000, comme les pourcentages de la
 * disposition multiplies par dix.
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
  if (!numero && !nom && !disposition.sponsors) return null;

  const tailleNom = (disposition.nomHauteur * 10) / HAUTEUR_CAPITALE;
  const tailleNumero = (disposition.numeroHauteur * 10) / HAUTEUR_CAPITALE;
  // La ligne de base est sous le centre vertical, d'une demi-capitale.
  const baseNom = disposition.nomY * 10 + (disposition.nomHauteur * 10) / 2;
  const baseNumero = disposition.numeroY * 10 + (disposition.numeroHauteur * 10) / 2;

  const gaucheNumero = 500 - (mesure.largeurEm * tailleNumero) / 2;
  const logo = LOGO_DIAMETRE * disposition.numeroHauteur * 10;
  const logoY = baseNumero - LOGO_CENTRE_DEPUIS_LE_BAS * disposition.numeroHauteur * 10;
  const version = versionSponsors(couleurs.remplissage);

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="pointer-events-none absolute inset-0 size-full"
      style={{ fontFamily: tanker.style.fontFamily }}
      aria-hidden="true"
    >
      {disposition.sponsors ? (
        <>
          <SponsorDos sponsor={SPONSORS.haut} version={version} centreY={disposition.sponsorHautY * 10} largeur={disposition.sponsorLargeur * 10} />
          <SponsorDos sponsor={SPONSORS.bas} version={version} centreY={disposition.sponsorBasY * 10} largeur={disposition.sponsorLargeur * 10} />
        </>
      ) : null}
      {nom ? <TexteFloque texte={nom} x={500} y={baseNom} taille={tailleNom} couleurs={couleurs} espacement={0.03} /> : null}
      {numero ? (
        <>
          <TexteFloque texte={numero} x={500} y={baseNumero} taille={tailleNumero} couleurs={couleurs} />
          {mesure.centres.map((centre, rang) => (
            <image
              key={rang}
              href={LOGO}
              x={gaucheNumero + centre * tailleNumero - logo / 2}
              y={logoY - logo / 2}
              width={logo}
              height={logo}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}
