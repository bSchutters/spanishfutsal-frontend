import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formaterDate } from "@/hub/dates";
import type { RecapJoma } from "./calculs";

/**
 * Le PDF de la commande Joma : les quantites par reference, couleur et
 * taille. A4, polices standard du PDF, aucune ressource a charger. Ni prix,
 * ni noms de joueurs, ni flocages (Bryan, 06/10/2026) : il part chez le
 * fournisseur, qui ne floque pas.
 */

const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 40;
const LIGNE = 18;
const TAILLE_CELLULE = 9;
const INTERLIGNE = 11;
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

/**
 * Un texte en lignes qui tiennent dans `largeur`, coupees entre les mots ;
 * un mot plus long que la colonne, une reference par exemple, se coupe
 * lui-meme. Rien ne se perd : Joma doit lire le nom entier.
 */
export function lignesDe(texte: string, police: PDFFont, taille: number, largeur: number): string[] {
  const tient = (t: string) => police.widthOfTextAtSize(t, taille) <= largeur;
  const lignes: string[] = [];
  let courante = "";
  for (const mot of textePdf(texte).split(" ").filter(Boolean)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (tient(essai)) {
      courante = essai;
      continue;
    }
    if (courante) lignes.push(courante);
    let reste = mot;
    while (!tient(reste) && reste.length > 1) {
      let n = reste.length - 1;
      while (n > 1 && !tient(reste.slice(0, n))) n--;
      lignes.push(reste.slice(0, n));
      reste = reste.slice(n);
    }
    courante = reste;
  }
  if (courante) lignes.push(courante);
  return lignes.length > 0 ? lignes : [""];
}

/** La hauteur d'une rangee : une ligne de tableau, plus un interligne par ligne de texte en plus. */
const hauteurDe = (contenus: string[][]) => LIGNE + (Math.max(1, ...contenus.map((c) => c.length)) - 1) * INTERLIGNE;

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

  /** Chaque valeur en lignes a la largeur de sa colonne. */
  private decouper(colonnes: Colonne[], valeurs: string[], police: PDFFont): string[][] {
    return colonnes.map((c, i) => lignesDe(valeurs[i] ?? "", police, TAILLE_CELLULE, c.largeur - 8));
  }

  private entete(colonnes: Colonne[]) {
    const contenus = this.decouper(colonnes, colonnes.map((c) => c.titre), this.grasse);
    const hauteur = hauteurDe(contenus);
    this.page.drawRectangle({ x: MARGE, y: this.y - hauteur, width: LARGEUR - 2 * MARGE, height: hauteur, color: FOND_ENTETE });
    this.cellules(colonnes, contenus, this.grasse);
  }

  private cellules(colonnes: Colonne[], contenus: string[][], police: PDFFont) {
    let x = MARGE + 6;
    colonnes.forEach((c, i) => {
      contenus[i].forEach((valeur, n) => {
        const decalage = c.aDroite ? c.largeur - 12 - police.widthOfTextAtSize(valeur, TAILLE_CELLULE) : 0;
        this.page.drawText(valeur, { x: x + decalage, y: this.y - 12.5 - n * INTERLIGNE, size: TAILLE_CELLULE, font: police });
      });
      x += c.largeur;
    });
    this.y -= hauteurDe(contenus);
  }

  tableau(colonnes: Colonne[], lignes: string[][]) {
    const rangees = lignes.map((valeurs) => this.decouper(colonnes, valeurs, this.normale));
    // L'en-tete ne reste pas seul en bas de page : la premiere rangee le suit.
    this.place(LIGNE + hauteurDe(rangees[0] ?? []));
    this.entete(colonnes);
    for (const contenus of rangees) {
      if (this.place(hauteurDe(contenus))) this.entete(colonnes);
      this.cellules(colonnes, contenus, this.normale);
      this.page.drawLine({
        start: { x: MARGE, y: this.y },
        end: { x: LARGEUR - MARGE, y: this.y },
        thickness: 0.5,
        color: TRAIT,
      });
    }
  }
}

// La largeur utile de la page, 515 points ; l'article, le plus long, a la plus large.
const COLONNES_TOTAUX: Colonne[] = [
  { titre: "Référence", largeur: 90 },
  { titre: "Article", largeur: 220 },
  { titre: "Couleur", largeur: 85 },
  { titre: "Taille", largeur: 60 },
  { titre: "Quantité", largeur: 60, aDroite: true },
];

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * `copie` : le PDF d'une commande deja passee chez Joma, date de sa commande
 * (`passeeLe`) en tete, et marque comme une copie pour que personne ne le
 * prenne pour une nouvelle commande.
 */
export async function pdfCommandeJoma(
  recap: RecapJoma,
  maintenant = new Date(),
  { copie = false, passeeLe = null }: { copie?: boolean; passeeLe?: string | null } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Commande Joma - UD Asturiana");
  doc.setAuthor("UD Asturiana");
  doc.setCreationDate(maintenant);
  const normale = await doc.embedFont(StandardFonts.Helvetica);
  const grasse = await doc.embedFont(StandardFonts.HelveticaBold);
  const mise = new Mise(doc, normale, grasse);

  mise.texte("UD Asturiana · Commande Joma", 18, true);
  mise.texte(
    `${formaterDate(passeeLe ?? maintenant)} · ${pluriel(recap.commandes, "commande")} · ${pluriel(recap.pieces, "pièce")}`,
    10,
    false,
    GRIS,
  );
  if (copie) mise.texte(`Copie de la commande, téléchargée le ${formaterDate(maintenant)}`, 10, true, GRIS);
  mise.espace(14);

  mise.texte("Quantités par article", 12, true);
  mise.espace(2);
  mise.tableau(
    COLONNES_TOTAUX,
    recap.totaux.map((t) => [t.reference || "-", t.article, t.couleur || "-", t.taille, String(t.quantite)]),
  );
  mise.espace(6);
  mise.texte(`Total : ${pluriel(recap.pieces, "pièce")}`, 10, true);

  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const pied = textePdf(`Page ${i + 1} / ${pages.length}`);
    page.drawText(pied, { x: LARGEUR - MARGE - normale.widthOfTextAtSize(pied, 8), y: MARGE - 16, size: 8, font: normale, color: GRIS });
    page.drawText("UD Asturiana", { x: MARGE, y: MARGE - 16, size: 8, font: normale, color: GRIS });
  });

  return doc.save();
}
