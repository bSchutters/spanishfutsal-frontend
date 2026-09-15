import * as z from "zod/mini";

// `zod/mini` et non `zod` : meme moteur, mais une API en fonctions que le
// bundler peut elaguer. La version classique embarquait ses methodes et ses
// traductions, 106 Ko compresses sur la page contact pour cinq champs.
//
// Zod teste au chargement s'il peut compiler ses validateurs avec
// `Function("")`. La politique de securite du site interdit eval : l'essai
// echoue en silence, mais Chrome enregistre une violation CSP a chaque visite.
// Sans JIT, rien ne change pour ce formulaire, et la violation disparait.
z.config({ jitless: true });

export const formSchema = z.object({
  firstName: z
    .string()
    .check(
      z.minLength(2, "Votre prénom doit contenir au moins 2 caractères"),
      z.maxLength(50, "Votre prénom ne doit pas dépasser 50 caractères"),
    ),
  lastName: z
    .string()
    .check(
      z.minLength(2, "Votre nom doit contenir au moins 2 caractères"),
      z.maxLength(50, "Votre nom ne doit pas dépasser 50 caractères"),
    ),
  email: z.email("Veuillez entrer une adresse email valide"),
  topic: z.string().check(z.minLength(1, "Veuillez sélectionner un sujet")),
  message: z
    .string()
    .check(
      z.minLength(10, "Votre message doit contenir au moins 10 caractères"),
      z.maxLength(500),
    ),
});

/** Les valeurs du formulaire, une fois validees. */
export type FormValues = z.infer<typeof formSchema>;
