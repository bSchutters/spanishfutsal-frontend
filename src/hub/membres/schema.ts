import * as z from "zod/mini";

import { idDe } from "@/hub/droits";
import { MODULE_KEYS, NIVEAUX, type ModuleKey, type Niveau } from "@/hub/modules";

z.config({ jitless: true });

/**
 * Les regles pures de la gestion des droits : ce qu'une fiche de membre
 * accepte, et la traduction entre l'ecran, ou chaque module a son niveau ou
 * rien, et le tableau que la collection Users stocke.
 */

const identifiant = z.number().check(z.int(), z.positive());

/** Le niveau retenu pour chaque module, par cle. Une cle absente ou nulle vaut « aucun acces ». */
export const schemaDroitsMembre = z.object({
  id: identifiant,
  acces: z.boolean(),
  niveaux: z.record(z.string(), z.nullable(z.enum(NIVEAUX))),
  fluxIds: z.array(identifiant),
});

export type SaisieDroitsMembre = z.infer<typeof schemaDroitsMembre>;

const texte = (max: number, quoi: string) =>
  z.string().check(z.trim(), z.minLength(1, `${quoi} : obligatoire.`), z.maxLength(max, `${quoi} : trop long.`));

/**
 * Un compte a creer. Le mot de passe n'est pas saisi : le serveur en tire un
 * au hasard et le montre une fois, a transmettre a la personne. Le role ne
 * se choisit pas non plus, un compte cree ici est un membre, jamais un
 * administrateur.
 */
export const schemaNouveauMembre = z.object({
  prenom: texte(60, "Le prénom"),
  nom: z.string().check(z.trim(), z.maxLength(80, "Le nom est trop long.")),
  email: z
    .string()
    .check(z.trim(), z.maxLength(200, "L'adresse est trop longue."))
    .check(z.refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Une adresse e-mail valide." })),
  acces: z.boolean(),
  niveaux: z.record(z.string(), z.nullable(z.enum(NIVEAUX))),
  fluxIds: z.array(identifiant),
});

export type SaisieNouveauMembre = z.infer<typeof schemaNouveauMembre>;

export const SAISIE_NOUVEAU_MEMBRE_VIDE: SaisieNouveauMembre = {
  prenom: "",
  nom: "",
  email: "",
  acces: true,
  niveaux: {},
  fluxIds: [],
};

export type NiveauxParModule = Partial<Record<ModuleKey, Niveau | null>>;

/** Une ligne du tableau `hub.modules` de la collection Users. */
export type LigneModule = { module: ModuleKey; level: Niveau };

/**
 * L'ecran vers la collection : une ligne par module accorde, dans l'ordre du
 * registre. Un module inconnu ou sans niveau n'en produit aucune, et la
 * personne n'y a donc pas acces.
 */
export function versLignesModules(niveaux: Record<string, Niveau | null | undefined>): LigneModule[] {
  return MODULE_KEYS.filter((cle) => niveaux[cle] === "read" || niveaux[cle] === "edit").map((cle) => ({
    module: cle,
    level: niveaux[cle] as Niveau,
  }));
}

/** La collection vers l'ecran : le niveau de chaque module du registre, ou null. */
export function depuisLignesModules(lignes: ReadonlyArray<{ module?: string | null; level?: string | null } | null> | null | undefined): NiveauxParModule {
  const niveaux: NiveauxParModule = {};
  for (const cle of MODULE_KEYS) niveaux[cle] = null;
  for (const ligne of lignes ?? []) {
    const cle = ligne?.module as ModuleKey | undefined;
    if (!cle || !MODULE_KEYS.includes(cle)) continue;
    if (ligne?.level === "read" || ligne?.level === "edit") niveaux[cle] = ligne.level;
  }
  return niveaux;
}

/**
 * Sans acces au Hub, les modules et les flux ne veulent plus rien dire : on
 * les efface, plutot que de laisser des droits dormants sur un compte ferme.
 */
export function nettoyerSelonAcces(saisie: SaisieDroitsMembre): SaisieDroitsMembre {
  if (saisie.acces) return saisie;
  return { ...saisie, niveaux: {}, fluxIds: [] };
}

/** Ce que la ligne d'un membre annonce : « Calendrier, édition », ou rien. */
export function resumeModules(niveaux: NiveauxParModule, nomDuModule: (cle: ModuleKey) => string, libelleNiveau: (n: Niveau) => string): string[] {
  return MODULE_KEYS.filter((cle) => niveaux[cle]).map((cle) => `${nomDuModule(cle)}, ${libelleNiveau(niveaux[cle] as Niveau).toLowerCase()}`);
}

/** Un flux du club, tel que la page le propose a cocher. */
export type FluxChoix = { id: number; nom: string; couleur: string | null };

/** Un document de la collection Users, la part qui sert ici. */
export type Doc = Record<string, unknown> & { id: number | string };

export type Membre = {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  /** Un administrateur a tout sans rien regler : sa fiche ne se modifie pas ici. */
  administrateur: boolean;
  acces: boolean;
  niveaux: NiveauxParModule;
  fluxIds: number[];
  /** Les rappels qu'il a choisis lui-meme dans son profil. */
  pushActif: boolean;
  creeLe: string;
};

const ids = (relations: unknown): number[] =>
  Array.isArray(relations) ? relations.map((r) => Number(idDe(r as never))).filter((n) => !Number.isNaN(n)) : [];

export function membreDe(doc: Doc): Membre {
  const hub = (doc.hub ?? {}) as {
    access?: unknown;
    modules?: ReadonlyArray<{ module?: string | null; level?: string | null } | null> | null;
    feeds?: unknown;
    push_enabled?: unknown;
  };
  const administrateur = doc.role === "admin";
  return {
    id: Number(doc.id),
    prenom: String(doc.first_name ?? "").trim(),
    nom: String(doc.last_name ?? "").trim(),
    email: String(doc.email ?? ""),
    administrateur,
    acces: administrateur || hub.access === true,
    niveaux: depuisLignesModules(hub.modules),
    fluxIds: ids(hub.feeds),
    pushActif: hub.push_enabled === true,
    creeLe: String(doc.createdAt ?? ""),
  };
}

/** Le nom a montrer : prenom et nom, sinon le prenom, sinon le debut de l'adresse. */
export function nomDuMembre(membre: Pick<Membre, "prenom" | "nom" | "email">): string {
  const entier = [membre.prenom, membre.nom].filter(Boolean).join(" ").trim();
  return entier || membre.email.split("@")[0];
}

