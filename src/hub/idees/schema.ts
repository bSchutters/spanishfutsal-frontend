import * as z from "zod/mini";

z.config({ jitless: true });

/**
 * La saisie d'une idee et les regles pures du tableau : statuts, libelles,
 * tri d'une colonne. Partage entre le formulaire, les actions et les tests.
 */

export const STATUTS_IDEE = ["new", "kept", "discarded"] as const;
export type StatutIdee = (typeof STATUTS_IDEE)[number];

export const LIBELLES_STATUT_IDEE: Record<StatutIdee, string> = {
  new: "Nouvelle",
  kept: "Retenue",
  discarded: "Écartée",
};

export const COULEURS_STATUT_IDEE: Record<StatutIdee, string> = {
  new: "#a2d6f8",
  kept: "#7bd389",
  discarded: "#9fb3c9",
};

const identifiant = z.number().check(z.int(), z.positive());

const lien = z
  .string()
  .check(z.trim(), z.maxLength(500, "Le lien est trop long."))
  .check(
    z.refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), {
      message: "Le lien doit commencer par http:// ou https://.",
    }),
  );

export const schemaIdee = z.object({
  id: z.optional(identifiant),
  titre: z.string().check(z.trim(), z.minLength(1, "Le titre est obligatoire."), z.maxLength(200, "Le titre est trop long.")),
  description: z.string().check(z.maxLength(5000, "La description est trop longue.")),
  reseauxIds: z.array(identifiant),
  formatIds: z.array(identifiant),
  lienInspiration: lien,
  matchLieId: z.nullable(identifiant),
});

export type SaisieIdee = z.infer<typeof schemaIdee>;

export const SAISIE_IDEE_VIDE: SaisieIdee = {
  titre: "",
  description: "",
  reseauxIds: [],
  formatIds: [],
  lienInspiration: "",
  matchLieId: null,
};

export type TriIdees = "votes" | "date";

/**
 * L'ordre d'une colonne : les plus votees d'abord, a egalite les plus
 * recentes ; ou simplement les plus recentes. Ne modifie pas la liste recue.
 */
export function trierIdees<T extends { votes: number; creeLe: string }>(idees: readonly T[], tri: TriIdees): T[] {
  const parDate = (a: T, b: T) => b.creeLe.localeCompare(a.creeLe);
  return [...idees].sort(tri === "votes" ? (a, b) => b.votes - a.votes || parDate(a, b) : parDate);
}

/** Le vote bascule : present, il s'enleve ; absent, il s'ajoute. Une seule voix par personne. */
export function basculerVote(votants: readonly number[], utilisateurId: number): number[] {
  return votants.includes(utilisateurId) ? votants.filter((id) => id !== utilisateurId) : [...votants, utilisateurId];
}
