"use server";

import { EmailTemplate } from "@/components/ui/email-template";
import { adresseIp, verifierLimite, type Limite } from "@/hub/limiteur";
import { getPayloadClient } from "@/lib/payload";
import { Resend } from "resend";
import { formSchema } from "./schemas";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Cinq messages par heure et par adresse : un visiteur qui se reprend n'y
 * arrive jamais, un robot qui boucle s'arrete vite.
 */
const LIMITE_CONTACT: Limite = { max: 5, fenetreMs: 60 * 60 * 1000 };

export type ResultatEnvoi = { ok: true } | { ok: false; erreur: string };

/**
 * L'envoi du formulaire de contact. Une action serveur s'appelle sans passer
 * par le formulaire : la saisie est donc verifiee une seconde fois ici, et le
 * nombre d'envois limite. L'issue est renvoyee au formulaire, qui n'annonce
 * le succes qu'une fois le message parti.
 *
 * « Repondre » dans la boite du club ecrit directement au visiteur.
 */
export const send = async (saisie: unknown): Promise<ResultatEnvoi> => {
  const lecture = formSchema.safeParse(saisie);
  if (!lecture.success) {
    return { ok: false, erreur: lecture.error.issues[0]?.message ?? "Vérifiez votre saisie." };
  }
  const donnees = lecture.data;

  try {
    const payload = await getPayloadClient();
    const limite = await verifierLimite(payload, `site:contact:${await adresseIp()}`, LIMITE_CONTACT);
    if (!limite.ok) {
      return { ok: false, erreur: "Trop de messages envoyés d'ici. Réessayez dans une heure." };
    }

    const { error } = await resend.emails.send({
      from: `Formulaire de contact UD Asturiana <${process.env.RESEND_FROM_EMAIL}>`,
      to: "contact@udasturiana.be",
      replyTo: donnees.email,
      subject: `Sujet: ${donnees.topic}`,
      react: await EmailTemplate({
        firstName: donnees.firstName,
        email: donnees.email,
        topic: donnees.topic,
        message: donnees.message,
        lastName: donnees.lastName,
      }),
    });
    if (error) throw error;
  } catch (erreur) {
    console.error("Contact : envoi echoue", erreur);
    return { ok: false, erreur: "Votre message n'est pas parti. Réessayez dans un instant." };
  }

  return { ok: true };
};
