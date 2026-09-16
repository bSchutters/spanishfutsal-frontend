import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCookies } from "payload";
import { cache } from "react";

import { getPayloadClient } from "@/lib/payload";
import { aAccesHub, niveauModule, type UtilisateurHub } from "./droits";
import type { ModuleKey, Niveau } from "./modules";

/**
 * La session du Hub, lue depuis le cookie Payload de la requete.
 *
 * Tout ce qui est prive dans le Hub passe par `exigerAccesHub` ou
 * `exigerModule` : une page, une action serveur, une route. Masquer un
 * bouton ne suffit jamais, la verification se fait ici, cote serveur.
 */

export type UtilisateurSession = UtilisateurHub & {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

export type SessionHub = {
  user: UtilisateurSession;
  /** Expiration du jeton, en secondes depuis 1970, ou null si illisible. */
  exp: number | null;
};

/** La date d'expiration inscrite dans le jeton, sans en verifier la signature : Payload l'a deja fait. */
function expirationDuJeton(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const [, charge] = token.split(".");
    const json = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** Une seule lecture par requete, quel que soit le nombre de composants qui la demandent. */
export const lireSession = cache(async (): Promise<SessionHub | null> => {
  const entetes = await headers();
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: entetes });
  if (!user) return null;

  const token = parseCookies(entetes).get(`${payload.config.cookiePrefix}-token`);
  return { user: user as unknown as UtilisateurSession, exp: expirationDuJeton(token) };
});

/** Redirige vers la connexion sans session, ou sans acces au Hub. */
export async function exigerAccesHub(): Promise<SessionHub> {
  const session = await lireSession();
  if (!session || !aAccesHub(session.user)) redirect("/hub/connexion");
  return session;
}

/** Comme `exigerAccesHub`, puis exige un niveau sur un module. */
export async function exigerModule(module: ModuleKey, niveau: Niveau = "read"): Promise<SessionHub> {
  const session = await exigerAccesHub();
  const actuel = niveauModule(session.user, module);
  const suffisant = actuel === "edit" || (actuel === "read" && niveau === "read");
  if (!suffisant) redirect(`/hub?refus=${module}`);
  return session;
}

/** Prenom et nom, sinon le debut de l'adresse e-mail, jamais l'adresse entiere. */
/** Les initiales d'une personne, ou les deux premieres lettres de son adresse. */
export function initiales({
  first_name,
  last_name,
  email,
}: Pick<UtilisateurSession, "email" | "first_name" | "last_name">): string {
  const prenom = first_name?.trim();
  const nom = last_name?.trim();
  if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
  if (prenom) return prenom.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function nomAffiche(user: Pick<UtilisateurSession, "email" | "first_name" | "last_name">): string {
  const nom = [user.first_name, user.last_name]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" ");
  return nom || user.email.split("@")[0];
}
