import { z } from "zod";

// Zod 4 teste au chargement s'il peut compiler ses validateurs avec
// `Function("")`. La politique de securite du site interdit eval : l'essai
// echoue en silence, mais Chrome enregistre une violation CSP a chaque visite
// de la page contact. Sans JIT, rien ne change pour un formulaire de cinq
// champs, et la violation disparait.
z.config({ jitless: true });

export const formSchema = z.object({
  firstName: z
    .string()
    .min(2, "Votre prénom doit contenir au moins 2 caractères")
    .max(50, "Votre prénom ne doit pas dépasser 50 caractères"),
  lastName: z
    .string()
    .min(2, "Votre nom doit contenir au moins 2 caractères")
    .max(50, "Votre nom ne doit pas dépasser 50 caractères"),
  email: z.string().email("Veuillez entrer une adresse email valide"),
  topic: z.string().min(1, "Veuillez sélectionner un sujet"),
  message: z
    .string()
    .min(10, "Votre message doit contenir au moins 10 caractères")
    .max(500),
});
