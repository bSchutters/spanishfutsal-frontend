"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createLocalReq,
  generateExpiredPayloadCookie,
  generatePayloadCookie,
  LockedAuth,
  logoutOperation,
  type TypedUser,
} from "payload";
import * as z from "zod/mini";

import { getPayloadClient } from "@/lib/payload";
import { aAccesHub } from "@/hub/droits";
import { adresseIp, LIMITE_CONNEXION, verifierLimite } from "@/hub/limiteur";

z.config({ jitless: true });

const schemaConnexion = z.object({
  email: z.email("Entrez une adresse e-mail valide."),
  password: z.string().check(z.minLength(1, "Entrez votre mot de passe.")),
});

export type EtatConnexion = {
  erreur?: string;
  email?: string;
};

/**
 * La connexion au Hub. Le mot de passe est verifie par Payload, avec son
 * verrou apres cinq echecs ; par-dessus, une limite par adresse ralentit qui
 * essaierait plusieurs comptes. Le cookie pose est exactement celui de
 * l'administration : une seule session pour les deux.
 */
export async function seConnecter(_etat: EtatConnexion | undefined, formData: FormData): Promise<EtatConnexion> {
  const saisie = schemaConnexion.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!saisie.success) {
    return { erreur: saisie.error.issues[0]?.message ?? "Verifiez votre saisie.", email: String(formData.get("email") ?? "") };
  }

  const { email, password } = saisie.data;
  const payload = await getPayloadClient();

  const limite = await verifierLimite(payload, `hub:connexion:${await adresseIp()}`, LIMITE_CONNEXION);
  if (!limite.ok) {
    return { erreur: "Trop de tentatives. Réessayez dans un quart d'heure.", email };
  }

  let token: string | undefined;
  try {
    const resultat = await payload.login({ collection: "users", data: { email, password } });
    if (!resultat.token || !resultat.user) {
      return { erreur: "Adresse e-mail ou mot de passe incorrect.", email };
    }
    if (!aAccesHub(resultat.user)) {
      return { erreur: "Ce compte n'a pas accès au Hub. Demandez à un administrateur de l'ouvrir.", email };
    }
    token = resultat.token;
  } catch (erreur) {
    if (erreur instanceof LockedAuth) {
      return { erreur: "Compte verrouillé après trop d'échecs. Réessayez dans dix minutes.", email };
    }
    return { erreur: "Adresse e-mail ou mot de passe incorrect.", email };
  }

  const cookie = generatePayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
    returnCookieAsObject: true,
  });
  (await cookies()).set({
    name: cookie.name,
    value: cookie.value ?? "",
    httpOnly: true,
    secure: cookie.secure ?? false,
    sameSite: "lax",
    path: cookie.path ?? "/",
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
  });

  redirect("/hub");
}

/** Ferme la session cote Payload, puis retire le cookie. */
export async function seDeconnecter(): Promise<void> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: await headers() });

  if (user) {
    try {
      const req = await createLocalReq({ user: user as TypedUser }, payload);
      await logoutOperation({ collection: payload.collections.users, req });
    } catch {
      // La session est peut-etre deja close : le cookie part quand meme.
    }
  }

  const expire = generateExpiredPayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
  });
  (await cookies()).set({
    name: expire.name,
    value: "",
    httpOnly: true,
    secure: expire.secure ?? false,
    sameSite: "lax",
    path: expire.path ?? "/",
    expires: new Date(0),
  });

  redirect("/hub/connexion");
}
