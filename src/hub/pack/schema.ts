import * as z from "zod/mini";

z.config({ jitless: true });

/**
 * Les formes du module Pack : le catalogue d'articles Joma, les reglages de
 * la page des joueurs et les commandes. Sans base ni Payload, ce fichier se
 * lit depuis un composant client comme depuis un test.
 */

export const STATUTS_COMMANDE = ["received", "ordered", "delivered", "cancelled"] as const;
export type StatutCommande = (typeof STATUTS_COMMANDE)[number];

export const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  received: "Reçue",
  ordered: "Commandée chez Joma",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const COULEURS_STATUT_COMMANDE: Record<StatutCommande, string> = {
  received: "#f4a261",
  ordered: "#6ab0f3",
  delivered: "#7bd389",
  cancelled: "#8a94a6",
};

export type Photo = { id: number; url: string };

/** Une couleur d'un article, avec son code couleur Joma et ses photos. */
export type Variante = {
  /** L'identifiant de la ligne dans la collection, stable d'une modification a l'autre. */
  id: string;
  couleur: string;
  /** Le code couleur Joma, « 339 » : il complete la reference de l'article. */
  codeCouleur: string;
  /** Les photos de la couleur, la principale en premier. */
  photos: Photo[];
};

/** Comment la remise s'applique a un article : la generale, aucune, ou la sienne. */
export const MODES_REMISE = ["general", "none", "custom"] as const;
export type ModeRemise = (typeof MODES_REMISE)[number];

export const LIBELLES_MODE_REMISE: Record<ModeRemise, string> = {
  general: "Remise générale",
  none: "Sans remise",
  custom: "Remise particulière",
};

export type RemiseArticle = { mode: ModeRemise; /** En pourcentage, pour une remise particuliere. */ taux: number | null };

export type Article = {
  id: number;
  nom: string;
  /** La reference Joma du modele, « 104263 ». */
  reference: string;
  description: string;
  /** Le prix du catalogue Joma. */
  prixCatalogue: number;
  remise: RemiseArticle;
  /** Le prix que paie le joueur, calcule depuis le prix catalogue et la remise. */
  prix: number;
  tailles: string[];
  floquable: boolean;
  actif: boolean;
  ordre: number;
  variantes: Variante[];
};

/** Les prix des flocages, les memes pour tout article floquable. */
export type PrixFlocage = { numero: number; nom: number };

export type ReglagesPack = {
  ouvert: boolean;
  /** La remise generale, en pourcentage. */
  remise: number;
  /** « 2026-10-31 », dernier jour ou l'on peut commander, ou null. */
  dateLimite: string | null;
  jeton: string;
  motDePasse: string;
  flocage: PrixFlocage;
};

/** Une ligne de commande telle qu'elle est gardee : figee au moment de la commande. */
export type LigneCommande = {
  /** L'identifiant de la ligne dans la collection, absent pour une ligne nouvelle. */
  id: string | null;
  articleId: number | null;
  varianteId: string | null;
  article: string;
  couleur: string;
  reference: string;
  taille: string;
  quantite: number;
  numero: string;
  nom: string;
  prixUnitaire: number;
};

export type Commande = {
  id: number;
  joueurId: number | null;
  /** Le nom a afficher : la fiche de l'effectif, ou le nom saisi pour « Autre ». */
  personne: string;
  autreNom: string;
  telephone: string;
  email: string;
  remarque: string;
  lignes: LigneCommande[];
  total: number;
  statut: StatutCommande;
  creeLe: string;
  commandeeLe: string | null;
};

const identifiant = z.number().check(z.int(), z.positive());
const texteLibre = (max: number, message: string) => z.string().check(z.trim(), z.maxLength(max, message));
const obligatoire = (max: number, quoi: string) =>
  z.string().check(z.trim(), z.minLength(1, `${quoi} : obligatoire.`), z.maxLength(max, `${quoi} : trop long.`));
const prix = (quoi: string) =>
  z.number(`${quoi} : un nombre.`).check(z.gte(0, `${quoi} : pas de prix négatif.`), z.lte(1000, `${quoi} : trop élevé.`));

const pourcentage = (quoi: string) =>
  z.number(`${quoi} : un nombre.`).check(z.gte(0, `${quoi} : pas de pourcentage négatif.`), z.lte(100, `${quoi} : 100 % au plus.`));

/** Un numero de maillot : un ou deux chiffres, ou rien. */
export const NUMERO_VALIDE = /^\d{1,2}$/;
export const LONGUEUR_NOM_FLOCAGE = 15;

/** Une ligne telle qu'un joueur ou le club la saisit : le prix se calcule au serveur, jamais ici. */
export const schemaLigneSaisie = z.object({
  id: z.nullable(z.string()),
  // Nul pour une ligne deja enregistree dont l'article a ete supprime depuis.
  articleId: z.nullable(identifiant),
  varianteId: z.string(),
  taille: obligatoire(20, "La taille"),
  quantite: z.number().check(z.int(), z.gte(1, "Au moins une pièce."), z.lte(20, "Vingt pièces au plus par ligne.")),
  numero: z
    .string()
    .check(z.trim(), z.refine((v) => v === "" || NUMERO_VALIDE.test(v), "Le numéro : un ou deux chiffres.")),
  nom: texteLibre(LONGUEUR_NOM_FLOCAGE, `Le nom à floquer : ${LONGUEUR_NOM_FLOCAGE} caractères au plus.`),
});
export type LigneSaisie = z.infer<typeof schemaLigneSaisie>;

const emailOuVide = z
  .string()
  .check(
    z.trim(),
    z.maxLength(200, "L'adresse est trop longue."),
    z.refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "L'adresse e-mail n'est pas valide."),
  );

/** La commande envoyee depuis la page des joueurs. */
export const schemaCommandeJoueur = z
  .object({
    joueurId: z.nullable(identifiant),
    autreNom: texteLibre(80, "Le nom est trop long."),
    telephone: texteLibre(30, "Le téléphone est trop long."),
    email: emailOuVide,
    remarque: texteLibre(500, "La remarque : 500 caractères au plus."),
    lignes: z.array(schemaLigneSaisie).check(z.minLength(1, "Ajoutez au moins un article."), z.maxLength(40, "Quarante lignes au plus.")),
  })
  .check(
    z.refine((s) => s.joueurId !== null || s.autreNom !== "", {
      message: "Choisissez votre nom dans la liste, ou indiquez-le.",
      path: ["joueurId"],
    }),
    z.refine((s) => s.telephone !== "" || s.email !== "", {
      message: "Indiquez un téléphone ou une adresse e-mail.",
      path: ["telephone"],
    }),
  );
export type SaisieCommandeJoueur = z.infer<typeof schemaCommandeJoueur>;

/** La meme commande, reprise par le club depuis le Hub. */
export const schemaCommandeHub = z
  .object({
    id: identifiant,
    statut: z.enum(STATUTS_COMMANDE),
    telephone: texteLibre(30, "Le téléphone est trop long."),
    email: emailOuVide,
    remarque: texteLibre(500, "La remarque : 500 caractères au plus."),
    lignes: z.array(schemaLigneSaisie).check(z.minLength(1, "Une commande garde au moins un article."), z.maxLength(40, "Quarante lignes au plus.")),
  });
export type SaisieCommandeHub = z.infer<typeof schemaCommandeHub>;

/** Un article du catalogue, tel que le Hub le cree ou le modifie. */
export const schemaArticle = z
  .object({
    id: z.nullable(identifiant),
    nom: obligatoire(80, "Le nom"),
    reference: texteLibre(40, "La référence : 40 caractères au plus."),
    description: texteLibre(500, "La description : 500 caractères au plus."),
    prixCatalogue: prix("Le prix catalogue"),
    modeRemise: z.enum(MODES_REMISE),
    remiseParticuliere: z.nullable(pourcentage("La remise particulière")),
    tailles: z
      .array(z.string().check(z.trim(), z.minLength(1), z.maxLength(20, "Une taille : 20 caractères au plus.")))
      .check(z.minLength(1, "Indiquez au moins une taille."), z.maxLength(40, "Quarante tailles au plus.")),
    floquable: z.boolean(),
    actif: z.boolean(),
    variantes: z
      .array(
        z.object({
          id: z.nullable(z.string()),
          couleur: texteLibre(40, "Une couleur : 40 caractères au plus."),
          codeCouleur: texteLibre(20, "Un code couleur : 20 caractères au plus."),
          photoIds: z.array(identifiant).check(z.maxLength(10, "Dix photos au plus par couleur.")),
        }),
      )
      .check(z.minLength(1, "Ajoutez au moins une couleur."), z.maxLength(12, "Douze couleurs au plus.")),
  })
  .check(
    z.refine((a) => a.modeRemise !== "custom" || a.remiseParticuliere !== null, {
      message: "Indiquez le pourcentage de la remise particulière.",
      path: ["remiseParticuliere"],
    }),
    z.refine((a) => a.variantes.length === 1 || a.variantes.every((v) => v.couleur !== ""), {
      message: "Avec plusieurs couleurs, chacune doit porter un nom.",
      path: ["variantes"],
    }),
    z.refine((a) => new Set(a.variantes.map((v) => v.couleur.toLowerCase())).size === a.variantes.length, {
      message: "Deux couleurs portent le même nom.",
      path: ["variantes"],
    }),
    z.refine((a) => new Set(a.tailles.map((t) => t.toLowerCase())).size === a.tailles.length, {
      message: "Une taille apparaît deux fois.",
      path: ["tailles"],
    }),
  );
export type SaisieArticle = z.infer<typeof schemaArticle>;

/** Les reglages de la page des joueurs. */
export const schemaReglagesPack = z.object({
  ouvert: z.boolean(),
  remise: pourcentage("La remise générale"),
  dateLimite: z.nullable(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/, "La date limite : jour, mois, année."))),
  motDePasse: z
    .string()
    .check(z.trim(), z.minLength(4, "Le mot de passe : 4 caractères au moins."), z.maxLength(60, "Le mot de passe est trop long.")),
  prixNumero: prix("Le prix du numéro"),
  prixNom: prix("Le prix du nom"),
});
export type SaisieReglagesPack = z.infer<typeof schemaReglagesPack>;

/** « XS, S, M » ou une taille par ligne, en liste propre. */
export function lireTailles(texte: string): string[] {
  return texte
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Le premier message d'une saisie refusee. */
export function premiereErreur(erreur: z.core.$ZodError): string {
  return erreur.issues[0]?.message ?? "Vérifiez votre saisie.";
}
