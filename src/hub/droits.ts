/**
 * Les droits du Hub, lus sur la fiche utilisateur.
 *
 * Fonctions pures : elles ne touchent ni a la base ni a la requete, ce qui
 * les rend testables a sec. Les regles d'acces Payload des collections du
 * Hub et les pages du Hub s'appuient toutes sur elles, pour qu'un droit
 * s'evalue au meme endroit quel que soit le chemin d'entree.
 *
 * Un administrateur Payload a tout : acces au Hub, edition sur chaque
 * module, tous les flux.
 */

import type { Access, FieldAccess, Where } from "payload";

import { MODULE_KEYS, type ModuleKey, type Niveau } from "./modules";

type Relation = number | string | { id: number | string };

export type UtilisateurHub = {
  id: number | string;
  email?: string | null;
  role?: string | null;
  hub?: {
    access?: boolean | null;
    modules?: Array<{ module?: string | null; level?: string | null } | null> | null;
    feeds?: Relation[] | null;
    push_enabled?: boolean | null;
    notified_feeds?: Relation[] | null;
  } | null;
};

const lire = (user: unknown) => user as UtilisateurHub | null | undefined;

/** L'identifiant d'une relation, qu'elle soit peuplee ou non. */
export function idDe(relation: Relation): number | string {
  return typeof relation === "object" ? relation.id : relation;
}

export function estAdmin(user: unknown): boolean {
  return lire(user)?.role === "admin";
}

export function aAccesHub(user: unknown): boolean {
  const compte = lire(user);
  if (!compte) return false;
  if (compte.role === "admin") return true;
  return compte.hub?.access === true;
}

/** Le niveau de l'utilisateur sur un module, ou null s'il n'y a pas acces. */
export function niveauModule(user: unknown, module: ModuleKey): Niveau | null {
  const compte = lire(user);
  if (!compte || !aAccesHub(compte)) return null;
  if (compte.role === "admin") return "edit";
  const ligne = compte.hub?.modules?.find((m) => m?.module === module);
  if (ligne?.level === "edit") return "edit";
  if (ligne?.level === "read") return "read";
  return null;
}

export function peutLire(user: unknown, module: ModuleKey): boolean {
  return niveauModule(user, module) !== null;
}

export function peutEditer(user: unknown, module: ModuleKey): boolean {
  return niveauModule(user, module) === "edit";
}

/** Les modules ouverts a l'utilisateur, dans l'ordre du registre. */
export function modulesAccessibles(user: unknown): ModuleKey[] {
  return MODULE_KEYS.filter((key) => peutLire(user, key));
}

/**
 * Les flux que l'utilisateur peut voir. `null` pour un administrateur, qui
 * les voit tous ; un tableau, eventuellement vide, pour les autres.
 */
export function idsFluxAutorises(user: unknown): Array<number | string> | null {
  const compte = lire(user);
  if (!compte || !aAccesHub(compte)) return [];
  if (compte.role === "admin") return null;
  return (compte.hub?.feeds ?? []).map(idDe);
}

/**
 * Le filtre Payload qui ne laisse passer que les documents rattaches a un
 * flux autorise. `true` pour l'administrateur, `false` sans acces.
 */
export function filtreParFlux(user: unknown, champ = "feeds"): boolean | Where {
  const ids = idsFluxAutorises(user);
  if (ids === null) return true;
  if (ids.length === 0) return false;
  return { [champ]: { in: ids } };
}

// Les regles d'acces Payload, pretes a poser sur les collections.

/** Administrateurs seulement. */
export const adminSeulement: Access = ({ req: { user } }) => estAdmin(user);

/** Toute personne admise dans le Hub. */
export const accesHub: Access = ({ req: { user } }) => aAccesHub(user);

/** Lecture sur un module. */
export const lectureModule =
  (module: ModuleKey): Access =>
  ({ req: { user } }) =>
    peutLire(user, module);

/** Edition sur un module. */
export const editionModule =
  (module: ModuleKey): Access =>
  ({ req: { user } }) =>
    peutEditer(user, module);

/** Lecture sur un module, restreinte aux documents des flux autorises. */
export const lectureModuleParFlux =
  (module: ModuleKey, champ = "feeds"): Access =>
  ({ req: { user } }) => {
    if (!peutLire(user, module)) return false;
    return filtreParFlux(user, champ);
  };

/** Edition sur un module, restreinte aux documents des flux autorises. */
export const editionModuleParFlux =
  (module: ModuleKey, champ = "feeds"): Access =>
  ({ req: { user } }) => {
    if (!peutEditer(user, module)) return false;
    return filtreParFlux(user, champ);
  };

/** Les flux eux-memes : chacun ne voit que les siens. */
export const lectureDesFlux: Access = ({ req: { user } }) => {
  if (!aAccesHub(user)) return false;
  return filtreParFlux(user, "id");
};

/** Un champ que seul un administrateur peut modifier. */
export const champAdmin: FieldAccess = ({ req: { user } }) => estAdmin(user);

/** Un champ que l'interesse ou un administrateur peut modifier. */
export const champSoiOuAdmin: FieldAccess = ({ req: { user }, id }) => {
  if (estAdmin(user)) return true;
  if (!user || id === undefined) return false;
  return String(user.id) === String(id);
};
