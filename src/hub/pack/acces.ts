import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * L'acces a la page des joueurs : le lien secret, puis le mot de passe.
 *
 * Une fois le mot de passe donne, le navigateur garde un cookie qui en est
 * la signature, et non le mot de passe lui-meme. La signature melange le
 * jeton du lien et le mot de passe : changer l'un ou l'autre dans le Hub
 * renvoie tout le monde a l'ecran du mot de passe.
 */

export const COOKIE_ACCES_PACK = "pack_acces";

/** Trente jours : le temps d'une campagne de commandes. */
export const DUREE_ACCES_PACK_SECONDES = 30 * 24 * 60 * 60;

export function signatureAcces(secret: string, jeton: string, motDePasse: string): string {
  return createHmac("sha256", secret).update(`${jeton}\u0000${motDePasse}`).digest("base64url");
}

/** Le cookie correspond-il au lien et au mot de passe du moment ? */
export function accesValide(cookie: string | undefined, secret: string, jeton: string, motDePasse: string): boolean {
  if (!cookie || !motDePasse) return false;
  const attendu = Buffer.from(signatureAcces(secret, jeton, motDePasse));
  const recu = Buffer.from(cookie);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

/** Le mot de passe saisi est-il le bon ? Comparaison a duree constante. */
export function motDePasseCorrect(saisi: string, attendu: string): boolean {
  if (!attendu) return false;
  const a = Buffer.from(saisi.trim());
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Un lien court, a envoyer dans un message (Bryan, 15/10/2026) : onze
 * caracteres, 64 bits. Le lien seul ne fait pas entrer : le mot de passe et
 * la limite des essais gardent la page.
 */
const LONGUEUR_JETON = 11;

/** Un nouveau lien, tire au hasard (« Nouveau lien » dans le Hub). */
export function genererJetonLien(): string {
  return randomBytes(8).toString("base64url");
}

/**
 * Le premier jeton du lien, tire du secret du serveur plutot qu'au hasard :
 * le meme a chaque calcul, imprevisible sans le secret. Deux premiers
 * chargements simultanes ecrivent donc le meme, et aucun lien deja montre ne
 * meurt. « Nouveau lien » en tire ensuite un au hasard.
 */
export function jetonInitial(secret: string): string {
  return createHmac("sha256", secret).update("pack:lien:initial").digest("base64url").slice(0, LONGUEUR_JETON);
}

/** Un jeton de lien bien forme, avant toute lecture en base. Les anciens liens, plus longs, restent valables. */
export function jetonBienForme(jeton: string): boolean {
  return new RegExp(`^[A-Za-z0-9_-]{${LONGUEUR_JETON},}$`).test(jeton);
}
