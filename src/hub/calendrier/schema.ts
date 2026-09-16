import * as z from "zod/mini";

z.config({ jitless: true });

/**
 * La saisie d'un evenement, telle que le formulaire l'envoie et que l'action
 * serveur la relit. Les dates sont des valeurs de champs datetime-local, en
 * heure de Bruxelles ; c'est l'action qui les convertit.
 */

const identifiant = z.number().check(z.int(), z.positive());
const identifiants = z.array(identifiant);
const dateHeure = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date ou heure invalide."));
const lienFacultatif = z.union([z.literal(""), z.url("Lien invalide.")]);

export const STATUTS = ["to_create", "ready", "published", "cancelled"] as const;
export type Statut = (typeof STATUTS)[number];

export const LIBELLES_STATUT: Record<Statut, string> = {
  to_create: "À créer",
  ready: "Prêt",
  published: "Publié",
  cancelled: "Annulé",
};

/** La couleur du statut, pour les pastilles du Hub. */
export const COULEURS_STATUT: Record<Statut, string> = {
  to_create: "#ff6b6b",
  ready: "#f4a261",
  published: "#7bd389",
  cancelled: "#9fb3c9",
};

/** Le repere du statut en texte, pour les flux iCal, tel que le cahier le fixe. */
export const REPERES_STATUT: Record<Statut, string> = {
  to_create: "🔴",
  ready: "🟠",
  published: "🟢",
  cancelled: "❌",
};

export const JOURS = [
  { valeur: "mon", libelle: "Lun" },
  { valeur: "tue", libelle: "Mar" },
  { valeur: "wed", libelle: "Mer" },
  { valeur: "thu", libelle: "Jeu" },
  { valeur: "fri", libelle: "Ven" },
  { valeur: "sat", libelle: "Sam" },
  { valeur: "sun", libelle: "Dim" },
] as const;

export const schemaEvenement = z.object({
  id: z.optional(identifiant),
  titre: z.string().check(z.trim(), z.minLength(1, "Le titre est obligatoire."), z.maxLength(200)),
  typeId: identifiant,
  debut: dateHeure,
  fin: z.union([z.literal(""), dateHeure]),
  journeeEntiere: z.boolean(),
  heureRdv: z.union([z.literal(""), dateHeure]),
  lieuNom: z.string().check(z.maxLength(200)),
  lieuAdresse: z.string().check(z.maxLength(300)),
  fluxIds: identifiants.check(z.minLength(1, "Choisissez au moins un flux.")),
  fluxPrincipalId: z.nullable(identifiant),
  responsablesIds: identifiants,
  description: z.string().check(z.maxLength(5000)),
  notesInternes: z.string().check(z.maxLength(5000)),
  annule: z.boolean(),
  pasDeRappel: z.boolean(),
  recurrence: z.object({
    frequence: z.enum(["none", "weekly", "monthly"]),
    intervalle: z.number().check(z.int(), z.gte(1), z.lte(52)),
    jours: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])),
    jusquAu: z.union([z.literal(""), z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}/))]),
  }),
  post: z.object({
    statut: z.enum(STATUTS),
    reseauxIds: identifiants,
    formatIds: z.array(identifiant),
    legende: z.string().check(z.maxLength(5000)),
    lienVisuels: lienFacultatif,
    visuelIds: z.array(identifiant),
    lienPublication: lienFacultatif,
    vues: z.nullable(z.number().check(z.int(), z.gte(0))),
    matchLieId: z.nullable(identifiant),
  }),
  match: z.object({
    adversaire: z.string().check(z.maxLength(200)),
    domicile: z.boolean(),
    competition: z.string().check(z.maxLength(100)),
  }),
});

export type SaisieEvenement = z.infer<typeof schemaEvenement>;

export const SAISIE_VIDE: SaisieEvenement = {
  titre: "",
  typeId: 0,
  debut: "",
  fin: "",
  journeeEntiere: false,
  heureRdv: "",
  lieuNom: "",
  lieuAdresse: "",
  fluxIds: [],
  fluxPrincipalId: null,
  responsablesIds: [],
  description: "",
  notesInternes: "",
  annule: false,
  pasDeRappel: false,
  recurrence: { frequence: "none", intervalle: 1, jours: [], jusquAu: "" },
  post: {
    statut: "to_create",
    reseauxIds: [],
    formatIds: [],
    legende: "",
    lienVisuels: "",
    visuelIds: [],
    lienPublication: "",
    vues: null,
    matchLieId: null,
  },
  match: { adversaire: "", domicile: true, competition: "" },
};
