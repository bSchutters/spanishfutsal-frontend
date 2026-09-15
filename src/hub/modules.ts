/**
 * Le registre des modules du Hub.
 *
 * La navigation, la page d'accueil et les options de droits de la fiche
 * utilisateur se construisent depuis cette liste. Ajouter un module, par
 * exemple les matchs et statistiques, revient a ajouter une entree ici et ses
 * pages sous app/(hub)/hub/(prive)/.
 *
 * Aucun import React ici : ce fichier est lu par la configuration Payload.
 * L'icone est un nom, la navigation le traduit en composant.
 */

export const NIVEAUX = ["read", "edit"] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const LIBELLES_NIVEAUX: Record<Niveau, string> = {
  read: "Lecture",
  edit: "Édition",
};

export type ModuleHub = {
  /** Cle stockee dans la fiche utilisateur. Ne change jamais. */
  key: string;
  nom: string;
  description: string;
  /** Premiere page du module. */
  route: string;
  /** Nom d'icone lucide, resolu par la navigation. */
  icone: "calendar-days";
  /** Les entrees de navigation du module, dans l'ordre. */
  navigation: ReadonlyArray<{ nom: string; route: string; icone: "calendar-days" | "list-todo" | "lightbulb" }>;
};

export const MODULES = [
  {
    key: "calendar",
    nom: "Calendrier",
    description: "Événements du club, posts à publier et idées de contenu.",
    route: "/hub/calendrier",
    icone: "calendar-days",
    navigation: [
      { nom: "Calendrier", route: "/hub/calendrier", icone: "calendar-days" },
      { nom: "À faire", route: "/hub/calendrier/a-faire", icone: "list-todo" },
      { nom: "Idées", route: "/hub/idees", icone: "lightbulb" },
    ],
  },
] as const satisfies ReadonlyArray<ModuleHub>;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_KEYS = MODULES.map((module) => module.key) as ModuleKey[];

export function trouverModule(key: string): ModuleHub | undefined {
  return MODULES.find((module) => module.key === key);
}
