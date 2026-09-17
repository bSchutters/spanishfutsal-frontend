import * as z from "zod/mini";

import { versChampDate } from "@/hub/dates";
import { LIBELLES_POSTE, POSTES, surLaFeuille, type Poste } from "@/lib/postes";

export { LIBELLES_POSTE, POSTES };

z.config({ jitless: true });

/**
 * La saisie d'une fiche joueur depuis le Hub : ce que la collection Joueurs
 * porte, dans les mots du club. Un seul numero, celui du site.
 */

/** Une fiche de la collection Joueurs, telle que le Hub la montre et la modifie. */
export type JoueurFiche = {
  id: number;
  prenom: string;
  nom: string;
  poste: Poste | null;
  gardien: boolean;
  /** Gardien ou joueur de champ : sur la feuille de match. Le staff, non, et un poste non renseigne non plus. */
  surFeuille: boolean;
  /** Le numero du joueur, celui du site. Le staff n'en a pas. */
  numero: number | null;
  /** « 2001-06-30 », ou null. */
  dateNaissance: string | null;
  capitaine: boolean;
  actif: boolean;
  photo: { id: number; url: string } | null;
};

const identifiant = z.number().check(z.int(), z.positive());
const texte = (max: number, quoi: string) =>
  z.string().check(z.trim(), z.minLength(1, `${quoi} : obligatoire.`), z.maxLength(max, `${quoi} : trop long.`));

/** « 2001-06-30 », ou rien. */
const jour = z
  .string()
  .check(z.refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Une date de naissance au format jour, mois, année." }));

export const schemaJoueur = z.object({
  id: z.optional(identifiant),
  prenom: texte(60, "Le prénom"),
  nom: texte(80, "Le nom"),
  poste: z.nullable(z.enum(POSTES)),
  /** Le numero du joueur, celui du site. */
  numero: z.nullable(z.number().check(z.int("Un numéro entier."), z.gte(0, "Un numéro de 0 à 99."), z.lte(99, "Un numéro de 0 à 99."))),
  dateNaissance: jour,
  capitaine: z.boolean(),
  actif: z.boolean(),
  photoId: z.nullable(identifiant),
});

export type SaisieJoueur = z.infer<typeof schemaJoueur>;

export const SAISIE_JOUEUR_VIDE: SaisieJoueur = {
  prenom: "",
  nom: "",
  poste: "Joueur",
  numero: null,
  dateNaissance: "",
  capitaine: false,
  actif: true,
  photoId: null,
};

/** Le staff n'a ni numero ni brassard : une fiche de coach ou de kine les perd. */
export function nettoyerSelonPoste(saisie: SaisieJoueur): SaisieJoueur {
  if (surLaFeuille(saisie.poste)) return saisie;
  return { ...saisie, numero: null, capitaine: false };
}

/** « 24 ans » a partir d'un jour de naissance, ou null. */
export function ageAu(dateNaissance: string | null, aujourdHui: Date): number | null {
  if (!dateNaissance) return null;
  const [annee, mois, jourDuMois] = dateNaissance.split("-").map(Number);
  if (!annee || !mois || !jourDuMois) return null;
  let age = aujourdHui.getUTCFullYear() - annee;
  const anniversairePasse =
    aujourdHui.getUTCMonth() + 1 > mois || (aujourdHui.getUTCMonth() + 1 === mois && aujourdHui.getUTCDate() >= jourDuMois);
  if (!anniversairePasse) age -= 1;
  return age >= 0 ? age : null;
}

const numeroOuNull = (valeur: unknown): number | null =>
  typeof valeur === "number" && Number.isFinite(valeur) ? Math.trunc(valeur) : null;

/** Un document de la collection Joueurs traduit en fiche, relation photo peuplee ou non. */
export function ficheDe(doc: Record<string, unknown> & { id: number | string }): JoueurFiche {
  const poste = (doc.poste as Poste | null | undefined) ?? null;
  const photo = doc.photo;
  return {
    id: Number(doc.id),
    prenom: String(doc.prenom ?? "").trim(),
    nom: String(doc.nom ?? "").trim(),
    poste,
    gardien: poste === "Gardien",
    surFeuille: surLaFeuille(poste),
    numero: numeroOuNull(doc.numero),
    dateNaissance: typeof doc.date_naissance === "string" ? versChampDate(doc.date_naissance) || null : null,
    capitaine: doc.capitaine === true,
    actif: doc.actif !== false,
    photo:
      photo && typeof photo === "object" && typeof (photo as { url?: unknown }).url === "string"
        ? { id: Number((photo as { id: unknown }).id), url: String((photo as { url: string }).url) }
        : null,
  };
}

