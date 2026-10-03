import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formaterDate } from "@/hub/dates";
import type { RecapJoma } from "./calculs";

/**
 * Le PDF de la commande Joma : les quantites par reference, couleur et
 * taille, puis le detail des pieces a floquer. A4, polices standard du PDF,
 * aucune ressource a charger. Ni prix ni noms de joueurs : il part chez le
 * fournisseur.
 */

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 40;
const LIGNE = 18;
const GRIS = rgb(0.45, 0.45, 0.45);
const FOND_ENTETE = rgb(0.92, 0.93, 0.95);
const TRAIT = rgb(0.8, 0.8, 0.82);

type Colonne = { titre: string; largeur: number; aDroite?: boolean };

/** Les signes typographiques, par leur code : le fichier source n'en contient aucun. */
const c = (...codes: number[]) => String.fromCharCode(...codes);
const APOSTROPHES = new RegExp(`[${c(0x2018, 0x2019, 0x02bc)}]`, "g");
const GUILLEMETS = new RegExp(`[${c(0x201c, 0x201d)}]`, "g");
const TIRETS = new RegExp(`[${c(0x2013, 0x2014)}]`, "g");
const POINTS = new RegExp(c(0x2026), "g");
const HORS_POLICE = new RegExp(`[^${c(0x20)}-${c(0x7e)}${c(0xa0)}-${c(0xff)}${c(0x20ac)}]`, "g");

/**
 * Les polices standard du PDF ne connaissent que l'alphabet latin courant :
 * les apostrophes et tirets typographiques sont ramenes a leur forme simple,
 * le reste d'inconnu devient un point d'interrogation plutot qu'une erreur.
 */
export function textePdf(texte: string): string {
  return texte
    .normalize("NFC")
    .replace(APOSTROPHES, "'")
    .replace(GUILLEMETS, '"')
    .replace(TIRETS, "-")
    .replace(POINTS, "...")
    .replace(HORS_POLICE, "?");
}

function tronquer(texte: string, police: PDFFont, taille: number, largeur: number): string {
  const propre = textePdf(texte);
  if (police.widthOfTextAtSize(propre, taille) <= largeur) return propre;
  let coupe = propre;
  while (coupe.length > 0 && police.widthOfTextAtSize(`${coupe}...`, taille) > largeur) coupe = coupe.slice(0, -1);
  return `${coupe}...`;
}

class Mise {
  page: PDFPage;
  y: number;

  constructor(
    private doc: PDFDocument,
    private normale: PDFFont,
    private grasse: PDFFont,
  ) {
    this.page = doc.addPage([LARGEUR, HAUTEUR]);
    this.y = HAUTEUR - MARGE;
  }

  /** Une nouvelle page si la place manque pour `hauteur`. */
  place(hauteur: number): boolean {
    if (this.y - hauteur >= MARGE + 20) return false;
    this.page = this.doc.addPage([LARGEUR, HAUTEUR]);
    this.y = HAUTEUR - MARGE;
    return true;
  }

  texte(contenu: string, taille: number, gras = false, couleur = rgb(0, 0, 0)) {
    this.place(taille + 6);
    this.page.drawText(textePdf(contenu), { x: MARGE, y: this.y - taille, size: taille, font: gras ? this.grasse : this.normale, color: couleur });
    this.y -= taille + 6;
  }

  espace(hauteur: number) {
    this.y -= hauteur;
  }

  private entete(colonnes: Colonne[]) {
    this.page.drawRectangle({ x: MARGE, y: this.y - LIGNE, width: LARGEUR - 2 * MARGE, height: LIGNE, color: FOND_ENTETE });
    this.cellules(colonnes, colonnes.map((c) => c.titre), true);
  }

  private cellules(colonnes: Colonne[], valeurs: string[], gras: boolean) {
    const police = gras ? this.grasse : this.normale;
    let x = MARGE + 6;
    colonnes.forEach((c, i) => {
      const valeur = tronquer(valeurs[i] ?? "", police, 9, c.largeur - 8);
      const decalage = c.aDroite ? c.largeur - 12 - police.widthOfTextAtSize(valeur, 9) : 0;
      this.page.drawText(valeur, { x: x + decalage, y: this.y - 12.5, size: 9, font: police });
      x += c.largeur;
    });
    this.y -= LIGNE;
  }

  tableau(colonnes: Colonne[], lignes: string[][]) {
    this.place(LIGNE * 2);
    this.entete(colonnes);
    for (const valeurs of lignes) {
      if (this.place(LIGNE)) this.entete(colonnes);
      this.cellules(colonnes, valeurs, false);
      this.page.drawLine({
        start: { x: MARGE, y: this.y },
        end: { x: LARGEUR - MARGE, y: this.y },
        thickness: 0.5,
        color: TRAIT,
      });
    }
  }
}

const COLONNES_TOTAUX: Colonne[] = [
  { titre: "Référence", largeur: 100 },
  { titre: "Article", largeur: 180 },
  { titre: "Couleur", largeur: 95 },
  { titre: "Taille", largeur: 75 },
  { titre: "Quantité", largeur: 65, aDroite: true },
];

const COLONNES_FLOCAGES: Colonne[] = [
  { titre: "Référence", largeur: 85 },
  { titre: "Article", largeur: 135 },
  { titre: "Couleur", largeur: 70 },
  { titre: "Taille", largeur: 50 },
  { titre: "Numéro", largeur: 50 },
  { titre: "Nom", largeur: 85 },
  { titre: "Qté", largeur: 40, aDroite: true },
];

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export async function pdfCommandeJoma(recap: RecapJoma, maintenant = new Date()): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Commande Joma - UD Asturiana");
  doc.setAuthor("UD Asturiana");
  doc.setCreationDate(maintenant);
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grasse = await doc.embedFont(StandardFonts.HelveticaBold);
  const mise = new Mise(doc, normale, grasse);

  mise.texte("UD Asturiana · Commande Joma", 18, true);
  mise.texte(
    `${formaterDate(maintenant)} · ${pluriel(recap.commandes, "commande")} · ${pluriel(recap.pieces, "pièce")}`,
    10,
    false,
    GRIS,
  );
  mise.espace(14);

  mise.texte("Quantités par article", 12, true);
  mise.espace(2);
  mise.tableau(
    COLONNES_TOTAUX,
    recap.totaux.map((t) => [t.reference || "-", t.article, t.couleur || "-", t.taille, String(t.quantite)]),
  );
  mise.espace(6);
  mise.texte(`Total : ${pluriel(recap.pieces, "pièce")}`, 10, true);
  mise.espace(16);

  mise.texte("Flocages", 12, true);
  if (recap.flocages.length === 0) {
    mise.texte("Aucune pièce à floquer.", 10, false, GRIS);
  } else {
    mise.texte("Les numéros et noms à imprimer, pièce par pièce.", 9, false, GRIS);
    mise.espace(2);
    mise.tableau(
      COLONNES_FLOCAGES,
      recap.flocages.map((f) => [f.reference || "-", f.article, f.couleur || "-", f.taille, f.numero || "-", f.nom || "-", String(f.quantite)]),
    );
  }

  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const pied = textePdf(`Page ${i + 1} / ${pages.length}`);
    page.drawText(pied, { x: LARGEUR - MARGE - normale.widthOfTextAtSize(pied, 8), y: MARGE - 16, size: 8, font: normale, color: GRIS });
    page.drawText("UD Asturiana", { x: MARGE, y: MARGE - 16, size: 8, font: normale, color: GRIS });
  });

  return doc.save();
}
