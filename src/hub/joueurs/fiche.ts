import * as z from "zod/mini";

import { numeroConnu, surLaFeuille, type Poste } from "./schema";

z.config({ jitless: true });

/**
 * La saisie d'une fiche joueur depuis le Hub : ce que la collection Joueurs
 * porte, dans les mots du club. Le numero du site et les deux numeros de
 * feuille de match sont des choses differentes, la fiche les montre cote a
 * cote sans les confondre.
 */

export const POSTES = ["Gardien", "Joueur", "Coach", "Kine"] as const;

export const LIBELLES_POSTE: Record<Poste, string> = {
  Gardien: "Gardien",
  Joueur: "Joueur de champ",
  Coach: "Coach",
  Kine: "Kiné",
};

const identifiant = z.number().check(z.int(), z.positive());
const texte = (max: number, quoi: string) =>
  z.string().check(z.trim(), z.minLength(1, `${quoi} : obligatoire.`), z.maxLength(max, `${quoi} : trop long.`));

/** Un numero de feuille de match : un maillot du club, ou rien. Le poste tranche ensuite. */
const numeroFeuille = z.nullable(z.number().check(z.int("Un numéro entier."), z.refine(numeroConnu, "Ce numéro n'existe sur aucun maillot.")));

/** « 2001-06-30 », ou rien. */
const jour = z
  .string()
  .check(z.refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Une date de naissance au format jour, mois, année." }));

export const schemaJoueur = z.object({
  id: z.optional(identifiant),
  prenom: texte(60, "Le prénom"),
  nom: texte(80, "Le nom"),
  poste: z.nullable(z.enum(POSTES)),
  /** Le numero affiche sur le site, rien a voir avec la feuille. */
  numero: z.nullable(z.number().check(z.int("Un numéro entier."), z.gte(0, "Un numéro de 0 à 99."), z.lte(99, "Un numéro de 0 à 99."))),
  numeroFeuille1: numeroFeuille,
  numeroFeuille2: numeroFeuille,
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
  numeroFeuille1: null,
  numeroFeuille2: null,
  dateNaissance: "",
  capitaine: false,
  actif: true,
  photoId: null,
};

/** Le staff n'a pas de numero de feuille : une fiche de coach ou de kine les perd. */
export function nettoyerSelonPoste(saisie: SaisieJoueur): SaisieJoueur {
  if (surLaFeuille(saisie.poste)) return saisie;
  return { ...saisie, numeroFeuille1: null, numeroFeuille2: null, capitaine: false };
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
