/**
 * Le registre des modules du Hub.
 *
 * La navigation, la page d'accueil et les options de droits de la fiche
 * utilisateur se construisent depuis cette liste. Ajouter un module revient
 * a ajouter une entree ici et ses pages sous app/(hub)/hub/(prive)/. Les
 * modules : `calendar` (calendrier, posts, idees), `players` (effectif et
 * statistiques des matchs) et `live` (audience des diffusions).
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

export type IconeModule = "calendar-days" | "users" | "radio";
export type IconeEntree =
  IconeModule | "list-todo" | "lightbulb" | "chart-column";

export type EntreeModule = { nom: string; route: string; icone: IconeEntree };

export type ModuleHub = {
  /** Cle stockee dans la fiche utilisateur. Ne change jamais. */
  key: string;
  nom: string;
  description: string;
  /** Premiere page du module. */
  route: string;
  /** Nom d'icone lucide, resolu par la navigation. */
  icone: IconeModule;
  /** Les entrees de navigation du module, dans l'ordre. */
  navigation: ReadonlyArray<EntreeModule>;
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
  {
    key: "players",
    nom: "Joueurs",
    description:
      "L'effectif, ses fiches et ses maillots, et les statistiques des matchs.",
    route: "/hub/joueurs/effectif",
    icone: "users",
    navigation: [
      { nom: "Effectif", route: "/hub/joueurs/effectif", icone: "users" },
      { nom: "Stats", route: "/hub/joueurs/stats", icone: "chart-column" },
    ],
  },
  {
    key: "live",
    nom: "Direct",
    description: "L'audience des diffusions, soirée par soirée.",
    route: "/hub/direct",
    icone: "radio",
    navigation: [{ nom: "Direct", route: "/hub/direct", icone: "radio" }],
  },
] as const satisfies ReadonlyArray<ModuleHub>;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_KEYS = MODULES.map((module) => module.key) as ModuleKey[];

export function trouverModule(key: string): ModuleHub | undefined {
  return MODULES.find((module) => module.key === key);
}
