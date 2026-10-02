"use server";

import { LockedAuth } from "payload";

import { LIMITE_CONNEXION, verifierLimite } from "@/hub/limiteur";
import { schemaChangementMotDePasse } from "@/hub/profil/mot-de-passe";
import { exigerAccesHub } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

export type EtatMotDePasse = {
  erreur?: string;
  change?: boolean;
};

/**
 * Le changement de mot de passe, par la personne elle-meme, depuis son
 * profil. La session en cours reste ouverte, et celles des autres appareils
 * aussi : Payload ne les ferme pas quand le mot de passe change.
 */
export async function changerMotDePasse(_etat: EtatMotDePasse, formData: FormData): Promise<EtatMotDePasse> {
  const { user } = await exigerAccesHub();

  const lecture = schemaChangementMotDePasse.safeParse({
    actuel: String(formData.get("actuel") ?? ""),
    nouveau: String(formData.get("nouveau") ?? ""),
    confirmation: String(formData.get("confirmation") ?? ""),
  });
  if (!lecture.success) {
    return { erreur: lecture.error.issues[0]?.message ?? "Vérifiez votre saisie." };
  }
  const { actuel, nouveau } = lecture.data;

  const payload = await getPayloadClient();
  const limite = await verifierLimite(payload, `hub:mot-de-passe:${user.id}`, LIMITE_CONNEXION);
  if (!limite.ok) {
    return { erreur: "Trop de tentatives. Réessayez dans un quart d'heure." };
  }

  // Le mot de passe actuel se verifie par une connexion : memes echecs
  // comptes et meme verrou qu'a l'entree du Hub. Elle ouvre une session dont
  // personne ne recoit le jeton, et qui expire d'elle-meme.
  try {
    await payload.login({ collection: "users", data: { email: user.email, password: actuel } });
  } catch (erreur) {
    if (erreur instanceof LockedAuth) {
      return { erreur: "Compte verrouillé après trop d'échecs. Réessayez dans dix minutes." };
    }
    return { erreur: "Le mot de passe actuel est incorrect." };
  }

  try {
    await payload.update({
      collection: "users",
      id: user.id,
      data: { password: nouveau },
      depth: 0,
      overrideAccess: false,
      user,
    });
  } catch {
    return { erreur: "Le changement a échoué. Réessayez." };
  }

  return { change: true };
}
