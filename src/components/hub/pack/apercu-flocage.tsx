"use client";

import { useEffect, useState } from "react";

import type { CouleursFlocage, DispositionFlocage, VersionLogo } from "@/hub/pack/schema";
import { imageSponsor, SPONSORS, versionSponsors, type Sponsor, type VersionSponsors } from "@/hub/pack/sponsors";
import { tanker } from "./police-tanker";

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

/** Le logo du club en couleurs, ou l'une des versions des gardiens (public/assets/images/flocage). */
const imageLogo = (logo: VersionLogo) => (logo === "club" ? "/assets/images/svg/logo-asturiana.svg" : `/assets/images/flocage/logo-${logo}.svg`);

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

/** L'espacement des lettres du nom, en em. */
const ESPACEMENT_NOM = 0.03;

/**
 * Jusqu'ou un nom trop long se resserre (ses lettres s'affinent, sa hauteur
 * reste) avant de rapetisser : au flocage, un long nom tient dans la largeur
 * du dos sans devenir illisible.
 */
const RESSERREMENT_MAX = 0.75;

/** La largeur d'un nom, en em, espacement compris : mesuree une fois la police chargee, estimee avant. */
function useLargeurDuNom(nom: string): number {
  const [mesure, setMesure] = useState<{ nom: string; largeurEm: number } | null>(null);

  useEffect(() => {
    if (!nom) return;
    let annule = false;
    const taille = 200;
    const police = `${taille}px ${tanker.style.fontFamily}`;
    void document.fonts.load(police, nom).then(() => {
      if (annule) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      ctx.font = police;
      setMesure({ nom, largeurEm: ctx.measureText(nom).width / taille + ESPACEMENT_NOM * nom.length });
    });
    return () => {
      annule = true;
    };
  }, [nom]);

  return mesure?.nom === nom ? mesure.largeurEm : nom.length * 0.5;
}

/**
 * Un texte en trois couches : contour exterieur, contour, puis la lettre. Le
 * nom n'a pas de contour, seul le numero en porte (precise par Bryan le
 * 06/10/2026) : sans `contours`, la lettre seule.
 */
function TexteFloque({
  texte,
  x,
  y,
  taille,
  couleurs,
  espacement = 0,
  contours = true,
  longueur,
}: {
  texte: string;
  x: number;
  y: number;
  taille: number;
  couleurs: CouleursFlocage;
  espacement?: number;
  contours?: boolean;
  /** Une longueur imposee : le texte se resserre pour y tenir. */
  longueur?: number;
}) {
  const commun = {
    x,
    y,
    fontSize: taille,
    textAnchor: "middle" as const,
    letterSpacing: espacement * taille,
    ...(longueur ? { textLength: longueur, lengthAdjust: "spacingAndGlyphs" as const } : {}),
  };
  if (!contours) {
    return (
      <text {...commun} fill={couleurs.remplissage}>
        {texte}
      </text>
    );
  }
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
 * Le logo du club sur la face avant, pose sur la photo principale (carree) a
 * la place reglee pour l'article. Coordonnees sur 1000, comme l'apercu du dos.
 * Un maillot photographie de biais demande de le tourner, de le pencher comme
 * la poitrine (inclinaison verticale) et de le resserrer en largeur.
 */
export function ApercuLogo({ disposition, logo = "club" }: { disposition: DispositionFlocage; logo?: VersionLogo }) {
  const taille = disposition.logoTaille * 10;
  const forme = [
    `translate(${disposition.logoX * 10} ${disposition.logoY * 10})`,
    `rotate(${disposition.logoRotation})`,
    `skewY(${disposition.logoInclinaison})`,
    `scale(${disposition.logoLargeur / 100} 1)`,
  ].join(" ");
  return (
    <svg viewBox="0 0 1000 1000" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      <g transform={forme}>
        <image href={imageLogo(logo)} x={-taille / 2} y={-taille / 2} width={taille} height={taille} />
      </g>
    </svg>
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
  logo = "club",
}: {
  numero: string;
  nom: string;
  couleurs: CouleursFlocage;
  disposition: DispositionFlocage;
  logo?: VersionLogo;
}) {
  const mesure = useMesureDuNumero(numero);
  const largeurNomEm = useLargeurDuNom(nom);
  if (!numero && !nom && !disposition.sponsors) return null;

  // Un nom plus large que permis se resserre d'abord, puis rapetisse s'il le faut.
  let tailleNom = (disposition.nomHauteur * 10) / HAUTEUR_CAPITALE;
  const largeurMax = disposition.nomLargeurMax * 10;
  const rapport = largeurMax / (largeurNomEm * tailleNom);
  if (rapport < RESSERREMENT_MAX) tailleNom *= rapport / RESSERREMENT_MAX;
  const longueurNom = rapport < 1 ? largeurMax : undefined;
  const tailleNumero = (disposition.numeroHauteur * 10) / HAUTEUR_CAPITALE;
  // La ligne de base est sous le centre vertical, d'une demi-capitale.
  const baseNom = disposition.nomY * 10 + (HAUTEUR_CAPITALE * tailleNom) / 2;
  const baseNumero = disposition.numeroY * 10 + (disposition.numeroHauteur * 10) / 2;

  const gaucheNumero = 500 - (mesure.largeurEm * tailleNumero) / 2;
  const diametreLogo = LOGO_DIAMETRE * disposition.numeroHauteur * 10;
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
      {nom ? <TexteFloque texte={nom} x={500} y={baseNom} taille={tailleNom} couleurs={couleurs} espacement={ESPACEMENT_NOM} contours={false} longueur={longueurNom} /> : null}
      {numero ? (
        <>
          <TexteFloque texte={numero} x={500} y={baseNumero} taille={tailleNumero} couleurs={couleurs} />
          {mesure.centres.map((centre, rang) => (
            <image
              key={rang}
              href={imageLogo(logo)}
              x={gaucheNumero + centre * tailleNumero - diametreLogo / 2}
              y={logoY - diametreLogo / 2}
              width={diametreLogo}
              height={diametreLogo}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}
