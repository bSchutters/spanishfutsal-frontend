import * as z from "zod/mini";

z.config({ jitless: true });

/** La longueur minimale d'un mot de passe choisi depuis le Hub. */
export const LONGUEUR_MINIMALE = 8;

/**
 * Ce qu'accepte le changement de mot de passe du profil : l'actuel, pour
 * prouver que c'est bien la personne, puis le nouveau, saisi deux fois. Un
 * compte cree depuis la page Membres recoit un mot de passe tire au hasard,
 * c'est ici qu'il le remplace par le sien.
 */
export const schemaChangementMotDePasse = z
  .object({
    actuel: z.string().check(z.minLength(1, "Entrez votre mot de passe actuel.")),
    nouveau: z
      .string()
      .check(
        z.minLength(LONGUEUR_MINIMALE, `Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MINIMALE} caractères.`),
        z.maxLength(200, "Le nouveau mot de passe est trop long."),
      ),
    confirmation: z.string(),
  })
  .check(
    z.refine((s) => s.confirmation === s.nouveau, {
      message: "Les deux saisies du nouveau mot de passe sont différentes.",
      path: ["confirmation"],
    }),
    z.refine((s) => s.nouveau !== s.actuel, {
      message: "Le nouveau mot de passe doit être différent de l'actuel.",
      path: ["nouveau"],
    }),
  );

export type SaisieMotDePasse = z.infer<typeof schemaChangementMotDePasse>;
