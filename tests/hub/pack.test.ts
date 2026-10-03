import { describe, expect, it } from "vitest";

import { accesValide, motDePasseCorrect, signatureAcces } from "@/hub/pack/acces";
import { construireLignes, dateLimitePassee, prixUnitaire, recapJoma, totalDes } from "@/hub/pack/calculs";
import {
  lireTailles,
  schemaArticle,
  schemaCommandeJoueur,
  type Article,
  type LigneCommande,
  type LigneSaisie,
} from "@/hub/pack/schema";

/**
 * Le module Pack : prix et flocages, commande construite depuis le
 * catalogue, recapitulatif pour Joma, acces a la page des joueurs.
 */

const FLOCAGE = { numero: 5, nom: 2.5 };

const maillot: Article = {
  id: 1,
  nom: "Maillot de match",
  description: "",
  prix: 35,
  tailles: ["S", "M", "L", "XL"],
  floquable: true,
  actif: true,
  ordre: 0,
  variantes: [
    { id: "bleu", couleur: "Bleu", reference: "JOMA-101", photo: null },
    { id: "blanc", couleur: "Blanc", reference: "JOMA-102", photo: null },
  ],
};

const sac: Article = {
  id: 2,
  nom: "Sac",
  description: "",
  prix: 19.9,
  tailles: ["Unique"],
  floquable: false,
  actif: false,
  ordre: 1,
  variantes: [{ id: "noir", couleur: "", reference: "JOMA-900", photo: null }],
};

const CATALOGUE = [maillot, sac];

const ligne = (partiel: Partial<LigneSaisie> = {}): LigneSaisie => ({
  id: null,
  articleId: 1,
  varianteId: "bleu",
  taille: "M",
  quantite: 1,
  numero: "",
  nom: "",
  ...partiel,
});

describe("prix", () => {
  it("ajoute 5 € pour le numéro et 2,50 € pour le nom", () => {
    expect(prixUnitaire(35, FLOCAGE, "", "")).toBe(35);
    expect(prixUnitaire(35, FLOCAGE, "10", "")).toBe(40);
    expect(prixUnitaire(35, FLOCAGE, "10", "RUBEN")).toBe(42.5);
  });

  it("additionne sans erreur d'arrondi", () => {
    expect(totalDes([{ prixUnitaire: 19.9, quantite: 3 }, { prixUnitaire: 0.1, quantite: 1 }])).toBe(59.8);
  });
});

describe("construction d'une commande", () => {
  it("prend nom, couleur, référence et prix dans le catalogue", () => {
    const r = construireLignes([ligne({ varianteId: "blanc", quantite: 2, numero: "10", nom: "Ruben" })], CATALOGUE, FLOCAGE, {
      inactifsAdmis: false,
    });
    expect(r).toEqual({
      ok: true,
      total: 85,
      lignes: [
        {
          id: null,
          articleId: 1,
          varianteId: "blanc",
          article: "Maillot de match",
          couleur: "Blanc",
          reference: "JOMA-102",
          taille: "M",
          quantite: 2,
          numero: "10",
          nom: "RUBEN",
          prixUnitaire: 42.5,
        },
      ],
    });
  });

  it("refuse une taille absente, une couleur disparue et un flocage sur un article qui ne se floque pas", () => {
    expect(construireLignes([ligne({ taille: "XXS" })], CATALOGUE, FLOCAGE, { inactifsAdmis: false }).ok).toBe(false);
    expect(construireLignes([ligne({ varianteId: "rouge" })], CATALOGUE, FLOCAGE, { inactifsAdmis: false }).ok).toBe(false);
    expect(
      construireLignes([ligne({ articleId: 2, varianteId: "noir", taille: "Unique", numero: "7" })], CATALOGUE, FLOCAGE, {
        inactifsAdmis: true,
      }).ok,
    ).toBe(false);
  });

  it("n'accepte un article retiré que depuis le Hub", () => {
    const sacSaisi = ligne({ articleId: 2, varianteId: "noir", taille: "Unique" });
    expect(construireLignes([sacSaisi], CATALOGUE, FLOCAGE, { inactifsAdmis: false }).ok).toBe(false);
    expect(construireLignes([sacSaisi], CATALOGUE, FLOCAGE, { inactifsAdmis: true }).ok).toBe(true);
  });

  it("garde le prix d'origine d'une ligne inchangée, recalcule celle dont le flocage change", () => {
    const ancienne: LigneCommande = {
      id: "l1",
      articleId: 1,
      varianteId: "bleu",
      article: "Maillot de match",
      couleur: "Bleu",
      reference: "JOMA-101",
      taille: "M",
      quantite: 1,
      numero: "",
      nom: "",
      prixUnitaire: 30,
    };
    const tailleChangee = construireLignes([ligne({ id: "l1", taille: "L", quantite: 2 })], CATALOGUE, FLOCAGE, {
      inactifsAdmis: true,
      anciennes: [ancienne],
    });
    expect(tailleChangee.ok && tailleChangee.lignes[0].prixUnitaire).toBe(30);
    const floquee = construireLignes([ligne({ id: "l1", numero: "4" })], CATALOGUE, FLOCAGE, {
      inactifsAdmis: true,
      anciennes: [ancienne],
    });
    expect(floquee.ok && floquee.lignes[0].prixUnitaire).toBe(40);
  });
});

describe("saisies", () => {
  const commande = { joueurId: 3, autreNom: "", telephone: "0470 00 00 00", email: "", remarque: "", lignes: [ligne()] };

  it("exige un nom et un moyen de contact", () => {
    expect(schemaCommandeJoueur.safeParse(commande).success).toBe(true);
    expect(schemaCommandeJoueur.safeParse({ ...commande, joueurId: null }).success).toBe(false);
    expect(schemaCommandeJoueur.safeParse({ ...commande, joueurId: null, autreNom: "Papa de Ruben" }).success).toBe(true);
    expect(schemaCommandeJoueur.safeParse({ ...commande, telephone: "" }).success).toBe(false);
    expect(schemaCommandeJoueur.safeParse({ ...commande, telephone: "", email: "ruben@exemple.be" }).success).toBe(true);
  });

  it("refuse un numéro qui n'en est pas un", () => {
    expect(schemaCommandeJoueur.safeParse({ ...commande, lignes: [ligne({ numero: "100" })] }).success).toBe(false);
    expect(schemaCommandeJoueur.safeParse({ ...commande, lignes: [ligne({ numero: "A" })] }).success).toBe(false);
  });

  it("veut un nom pour chaque couleur dès qu'il y en a plusieurs", () => {
    const article = {
      id: null,
      nom: "Short",
      description: "",
      prix: 20,
      tailles: ["M"],
      floquable: false,
      actif: true,
      variantes: [
        { id: null, couleur: "", reference: "J1", photoId: null },
        { id: null, couleur: "Blanc", reference: "J2", photoId: null },
      ],
    };
    expect(schemaArticle.safeParse(article).success).toBe(false);
    expect(schemaArticle.safeParse({ ...article, variantes: [article.variantes[0]] }).success).toBe(true);
  });

  it("lit une liste de tailles séparées par des virgules ou des lignes", () => {
    expect(lireTailles("XS, S ,M\nL;; XL")).toEqual(["XS", "S", "M", "L", "XL"]);
  });
});

describe("récapitulatif pour Joma", () => {
  const l = (partiel: Partial<LigneCommande>): LigneCommande => ({
    id: null,
    articleId: 1,
    varianteId: "bleu",
    article: "Maillot de match",
    couleur: "Bleu",
    reference: "JOMA-101",
    taille: "M",
    quantite: 1,
    numero: "",
    nom: "",
    prixUnitaire: 35,
    ...partiel,
  });

  it("additionne par référence, couleur et taille, et détaille les flocages", () => {
    const recap = recapJoma(
      [
        { lignes: [l({ quantite: 2 }), l({ taille: "S", numero: "10", nom: "RUBEN" })] },
        { lignes: [l({ numero: "10", nom: "RUBEN", taille: "S" }), l({ article: "Sac", reference: "JOMA-900", couleur: "", taille: "Unique" })] },
      ],
      new Set(),
      () => ["S", "M", "L"],
    );
    expect(recap.commandes).toBe(2);
    expect(recap.pieces).toBe(5);
    expect(recap.totaux.map((t) => [t.reference, t.taille, t.quantite])).toEqual([
      ["JOMA-101", "S", 2],
      ["JOMA-101", "M", 2],
      ["JOMA-900", "Unique", 1],
    ]);
    expect(recap.flocages.map((f) => [f.reference, f.taille, f.numero, f.nom, f.quantite])).toEqual([
      ["JOMA-101", "S", "10", "RUBEN", 2],
    ]);
  });

  it("laisse de côté les articles écartés, et une commande qui n'a plus rien", () => {
    const recap = recapJoma([{ lignes: [l({})] }, { lignes: [l({ article: "Sac" })] }], new Set(["Sac"]));
    expect(recap.commandes).toBe(1);
    expect(recap.pieces).toBe(1);
  });
});

describe("accès à la page des joueurs", () => {
  it("valide le cookie du lien et du mot de passe du moment, et lui seul", () => {
    const cookie = signatureAcces("secret", "jeton-du-lien-xxxxxxxx", "asturias");
    expect(accesValide(cookie, "secret", "jeton-du-lien-xxxxxxxx", "asturias")).toBe(true);
    expect(accesValide(cookie, "secret", "jeton-du-lien-xxxxxxxx", "autre")).toBe(false);
    expect(accesValide(cookie, "secret", "nouveau-jeton-xxxxxxxxx", "asturias")).toBe(false);
    expect(accesValide(undefined, "secret", "jeton-du-lien-xxxxxxxx", "asturias")).toBe(false);
  });

  it("compare le mot de passe saisi sans tenir compte des espaces autour", () => {
    expect(motDePasseCorrect(" asturias ", "asturias")).toBe(true);
    expect(motDePasseCorrect("Asturias", "asturias")).toBe(false);
    expect(motDePasseCorrect("x", "")).toBe(false);
  });

  it("garde le jour limite ouvert jusqu'au bout", () => {
    expect(dateLimitePassee("2026-10-31", "2026-10-31")).toBe(false);
    expect(dateLimitePassee("2026-10-31", "2026-11-01")).toBe(true);
    expect(dateLimitePassee(null, "2030-01-01")).toBe(false);
  });
});

describe("PDF pour Joma", () => {
  it("ramène le texte aux caractères des polices standard", async () => {
    const { textePdf } = await import("@/hub/pack/pdf");
    // Apostrophe et tiret typographiques, construits par leur code.
    expect(textePdf(`L${String.fromCharCode(0x2019)}été ${String.fromCharCode(0x2014)} 2,50 € · Núñez`)).toBe("L'été - 2,50 € · Núñez");
    expect(textePdf("Ballon ⚽")).toBe("Ballon ?");
  });

  it("produit un PDF, sur plusieurs pages quand la commande est longue", async () => {
    const { pdfCommandeJoma } = await import("@/hub/pack/pdf");
    const totaux = Array.from({ length: 80 }, (_, i) => ({
      reference: `J-${i}`,
      article: "Maillot de match",
      couleur: "Bleu",
      taille: "M",
      quantite: 1,
    }));
    const octets = await pdfCommandeJoma(
      { commandes: 3, pieces: 80, totaux, flocages: [{ ...totaux[0], numero: "10", nom: "RUBEN" }] },
      new Date("2026-10-03T10:00:00Z"),
    );
    const texte = new TextDecoder("latin1").decode(octets.slice(0, 8));
    expect(texte.startsWith("%PDF-")).toBe(true);
    const { PDFDocument } = await import("pdf-lib");
    expect((await PDFDocument.load(octets)).getPageCount()).toBeGreaterThan(1);
  });
});
