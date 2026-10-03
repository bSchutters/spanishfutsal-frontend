import { createHmac, timingSafeEqual } from "node:crypto";

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

/** Un jeton de lien bien forme, avant toute lecture en base. */
export function jetonBienForme(jeton: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(jeton);
}
