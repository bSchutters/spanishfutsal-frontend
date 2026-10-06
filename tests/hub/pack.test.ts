import { describe, expect, it } from "vitest";

import { accesValide, motDePasseCorrect, signatureAcces } from "@/hub/pack/acces";
import {
  construireLignes,
  dateLimitePassee,
  prixJoueur,
  prixUnitaire,
  recapJoma,
  referenceComplete,
  tauxRemise,
  totalDes,
} from "@/hub/pack/calculs";
import { articleDe, dispositionDe } from "@/hub/pack/conversions";
import {
  COULEURS_FLOCAGE_DEFAUT,
  DISPOSITION_FLOCAGE_DEFAUT,
  lireTailles,
  schemaArticle,
  schemaCommandeJoueur,
  type Article,
  type LigneCommande,
  type LigneSaisie,
} from "@/hub/pack/schema";
import { imageSponsor, SPONSORS, versionSponsors } from "@/hub/pack/sponsors";

/**
 * Le module Pack : prix et flocages, commande construite depuis le
 * catalogue, recapitulatif pour Joma, acces a la page des joueurs.
 */

const FLOCAGE = { numero: 5, nom: 2.5 };

const maillot: Article = {
  id: 1,
  nom: "Maillot de match",
  reference: "104263",
  description: "",
  prixCatalogue: 35,
  remise: { mode: "general", taux: null },
  prix: 35,
  tailles: ["S", "M", "L", "XL"],
  floquable: true,
  dispositionFlocage: DISPOSITION_FLOCAGE_DEFAUT,
  actif: true,
  ordre: 0,
  variantes: [
    { id: "bleu", couleur: "Bleu", codeCouleur: "339", photos: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT },
    { id: "blanc", couleur: "Blanc", codeCouleur: "200", photos: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT },
  ],
};

const sac: Article = {
  id: 2,
  nom: "Sac",
  reference: "400486",
  description: "",
  prixCatalogue: 19.9,
  remise: { mode: "none", taux: null },
  prix: 19.9,
  tailles: ["Unique"],
  floquable: false,
  dispositionFlocage: DISPOSITION_FLOCAGE_DEFAUT,
  actif: false,
  ordre: 1,
  variantes: [{ id: "noir", couleur: "", codeCouleur: "100", photos: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT }],
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

describe("référence Joma", () => {
  it("compose le modèle et le code couleur, ou garde celui des deux qui existe", () => {
    expect(referenceComplete("104263", "339")).toBe("104263.339");
    expect(referenceComplete(" 104263 ", "")).toBe("104263");
    expect(referenceComplete("", "339")).toBe("339");
  });
});

describe("remise", () => {
  it("prend la remise générale, aucune, ou celle de l'article", () => {
    expect(tauxRemise({ mode: "general", taux: null }, 30)).toBe(30);
    expect(tauxRemise({ mode: "none", taux: 50 }, 30)).toBe(0);
    expect(tauxRemise({ mode: "custom", taux: 10 }, 30)).toBe(10);
  });

  it("déduit la remise du prix catalogue, arrondi au centime", () => {
    expect(prixJoueur(59.95, { mode: "general", taux: null }, 30)).toBe(41.97);
    expect(prixJoueur(59.95, { mode: "none", taux: null }, 30)).toBe(59.95);
    expect(prixJoueur(59.95, { mode: "custom", taux: 10 }, 30)).toBe(53.96);
  });

  it("calcule le prix du joueur à la lecture d'un article", () => {
    const article = articleDe(
      { id: 7, name: "Maillot", price: 59.95, discount_mode: "custom", custom_discount: 10, variants: [], sizes: ["M"] },
      30,
    );
    expect([article.prixCatalogue, article.prix]).toEqual([59.95, 53.96]);
    expect(articleDe({ id: 8, name: "Sac", price: 20, variants: [] }, 25).prix).toBe(15);
  });
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
          reference: "104263.200",
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
      reference: "",
      description: "",
      prixCatalogue: 20,
      modeRemise: "general" as const,
      remiseParticuliere: null,
      tailles: ["M"],
      floquable: false,
      dispositionFlocage: DISPOSITION_FLOCAGE_DEFAUT,
      actif: true,
      variantes: [
        { id: null, couleur: "", codeCouleur: "339", photoIds: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT },
        { id: null, couleur: "Blanc", codeCouleur: "200", photoIds: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT },
      ],
    };
    expect(schemaArticle.safeParse(article).success).toBe(false);
    expect(schemaArticle.safeParse({ ...article, variantes: [article.variantes[0]] }).success).toBe(true);
  });

  it("demande le pourcentage d'une remise particulière", () => {
    const article = {
      id: null,
      nom: "Short",
      reference: "",
      description: "",
      prixCatalogue: 20,
      modeRemise: "custom" as const,
      remiseParticuliere: null,
      tailles: ["M"],
      floquable: false,
      dispositionFlocage: DISPOSITION_FLOCAGE_DEFAUT,
      actif: true,
      variantes: [{ id: null, couleur: "", codeCouleur: "", photoIds: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT }],
    };
    expect(schemaArticle.safeParse(article).success).toBe(false);
    expect(schemaArticle.safeParse({ ...article, remiseParticuliere: 15 }).success).toBe(true);
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

describe("photos d'une couleur", () => {
  it("met la photo principale en tête, puis les autres, sans les vides", () => {
    const article = articleDe({
      id: 9,
      name: "Maillot",
      price: 30,
      variants: [
        {
          id: "bleu",
          color: "Bleu",
          reference: "339",
          photo: { id: 1, url: "/a.webp" },
          photos: [{ id: 2, url: "/b.webp" }, 3, { id: 4, url: "/d.webp" }],
        },
      ],
    });
    expect(article.variantes[0].photos.map((p) => p.id)).toEqual([1, 2, 4]);
  });

  it("accepte dix photos au plus par couleur", () => {
    const variante = (n: number) => ({ id: null, couleur: "", codeCouleur: "", photoIds: Array.from({ length: n }, (_, i) => i + 1), photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT });
    const article = {
      id: null,
      nom: "Sac",
      reference: "",
      description: "",
      prixCatalogue: 20,
      modeRemise: "general" as const,
      remiseParticuliere: null,
      tailles: ["Unique"],
      floquable: false,
      dispositionFlocage: DISPOSITION_FLOCAGE_DEFAUT,
      actif: true,
    };
    expect(schemaArticle.safeParse({ ...article, variantes: [variante(10)] }).success).toBe(true);
    expect(schemaArticle.safeParse({ ...article, variantes: [variante(11)] }).success).toBe(false);
  });
});

describe("article supprimé", () => {
  const orpheline: LigneCommande = {
    id: "l9",
    articleId: null,
    varianteId: "x",
    article: "Ancien sweat",
    couleur: "Gris",
    reference: "100000.250",
    taille: "L",
    quantite: 1,
    numero: "",
    nom: "",
    prixUnitaire: 28,
  };

  it("garde la ligne d'une commande avec sa copie, seule la quantité change", () => {
    const r = construireLignes(
      [{ id: "l9", articleId: null, varianteId: "x", taille: "L", quantite: 2, numero: "", nom: "" }],
      CATALOGUE,
      FLOCAGE,
      { inactifsAdmis: true, anciennes: [orpheline] },
    );
    expect(r.ok && r.lignes).toEqual([{ ...orpheline, quantite: 2 }]);
    expect(r.ok && r.total).toBe(56);
  });

  it("refuse un article absent sans ligne enregistrée, comme depuis la page des joueurs", () => {
    const r = construireLignes(
      [{ id: null, articleId: 99, varianteId: "x", taille: "L", quantite: 1, numero: "", nom: "" }],
      CATALOGUE,
      FLOCAGE,
      { inactifsAdmis: false },
    );
    expect(r.ok).toBe(false);
  });
});

describe("menu du Pack", () => {
  it("range Catalogue puis Commandes en deux entrées sœurs, sans que l'une prolonge l'autre", async () => {
    const { trouverModule } = await import("@/hub/modules");
    const routes = trouverModule("pack")?.navigation.map((e) => e.route) ?? [];
    expect(routes).toEqual(["/hub/pack/catalogue", "/hub/pack/commandes"]);
    expect(routes.some((r) => routes.some((autre) => autre !== r && r.startsWith(`${autre}/`)))).toBe(false);
  });
});

describe("aperçu du flocage", () => {
  it("prend les couleurs et la position par défaut quand rien n'est réglé", () => {
    const article = articleDe({ id: 10, name: "Maillot", price: 30, flockable: true, variants: [{ id: "v", color: "Marine" }] });
    expect(article.dispositionFlocage).toEqual(DISPOSITION_FLOCAGE_DEFAUT);
    expect(article.variantes[0].couleursFlocage).toEqual(COULEURS_FLOCAGE_DEFAUT);
    expect(article.variantes[0].photoDosId).toBeNull();
  });

  it("garde une position réglée et complète celle qui manque", () => {
    const article = articleDe({
      id: 11,
      name: "Maillot",
      price: 30,
      flock_layout: { nomY: 20, numeroHauteur: 25, numeroY: "x" },
      variants: [{ id: "v", back_photo_id: 96, flock_fill: "#FFFFFF", flock_outline: "rouge" }],
    });
    expect(article.dispositionFlocage).toEqual({ ...DISPOSITION_FLOCAGE_DEFAUT, nomY: 20, numeroHauteur: 25 });
    expect(article.variantes[0].photoDosId).toBe(96);
    expect(article.variantes[0].couleursFlocage).toEqual({ ...COULEURS_FLOCAGE_DEFAUT, remplissage: "#ffffff" });
  });

  it("met les sponsors par défaut, sauf s'ils ont été retirés de l'article", () => {
    const sans = articleDe({ id: 12, name: "Maillot", price: 30, flock_layout: { numeroY: 41 }, variants: [{ id: "v" }] });
    expect(sans.dispositionFlocage.sponsors).toBe(true);
    const retires = articleDe({ id: 13, name: "Polo", price: 30, flock_layout: { sponsors: false, sponsorLargeur: 30 }, variants: [{ id: "v" }] });
    expect(retires.dispositionFlocage).toMatchObject({ sponsors: false, sponsorLargeur: 30, sponsorHautY: DISPOSITION_FLOCAGE_DEFAUT.sponsorHautY });
  });

  it("accepte une disposition d'avant les sponsors et la complète", () => {
    const ancienne = { nomY: 60, nomHauteur: 6, numeroY: 41, numeroHauteur: 22, logoInclinaison: -12 };
    const lecture = schemaArticle.safeParse({
      id: null,
      nom: "Maillot",
      reference: "104263",
      description: "",
      prixCatalogue: 16,
      modeRemise: "general",
      remiseParticuliere: null,
      tailles: ["M"],
      floquable: true,
      dispositionFlocage: ancienne,
      actif: true,
      variantes: [{ id: null, couleur: "", codeCouleur: "339", photoIds: [], photoDosId: null, couleursFlocage: COULEURS_FLOCAGE_DEFAUT }],
    });
    expect(lecture.success).toBe(true);
    if (!lecture.success) return;
    expect(dispositionDe(lecture.data.dispositionFlocage)).toEqual({ ...DISPOSITION_FLOCAGE_DEFAUT, ...ancienne });
  });

  it("laisse le logo de la face avant éteint tant qu'on ne l'a pas ajouté", () => {
    const sans = articleDe({ id: 14, name: "Short", price: 20, variants: [{ id: "v" }] });
    expect(sans.dispositionFlocage.logoAvant).toBe(false);
    const avec = articleDe({ id: 15, name: "Polo", price: 25, flock_layout: { logoAvant: true, logoX: 70, logoTaille: "grand" }, variants: [{ id: "v" }] });
    expect(avec.dispositionFlocage).toMatchObject({ logoAvant: true, logoX: 70, logoY: DISPOSITION_FLOCAGE_DEFAUT.logoY, logoTaille: DISPOSITION_FLOCAGE_DEFAUT.logoTaille });
    // Droit tant qu'on ne l'a pas penche : pas d'inclinaison, de rotation ni de resserrement.
    expect(avec.dispositionFlocage).toMatchObject({ logoInclinaison: 0, logoRotation: 0, logoLargeur: 100 });
  });

  it("choisit la version des sponsors d'après la couleur des lettres", () => {
    // Lettres jaunes sur le maillot marine, marine sur le jaune, noires pour le gardien.
    expect(versionSponsors("#fdd700")).toBe("dom");
    expect(versionSponsors("#223454")).toBe("ext");
    expect(versionSponsors("#000000")).toBe("gk-ext");
    expect(imageSponsor(SPONSORS.haut, "dom")).toBe("/assets/images/flocage/sofexia-dom.svg");
    expect(imageSponsor(SPONSORS.bas, "gk-ext")).toBe("/assets/images/flocage/wabee-gk-ext.svg");
  });
});
