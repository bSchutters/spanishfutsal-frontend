/**
 * L'IBAN du club, montre au joueur apres sa commande. Il se saisit avec ou
 * sans espaces ; on le garde sans, et on l'affiche par groupes de quatre.
 */

/** « be68 5390 0754 7034 » devient « BE68539007547034 ». */
export function normaliserIban(saisi: string): string {
  return saisi.replace(/\s+/g, "").toUpperCase();
}

/** Un IBAN dont la cle de controle tient (ISO 13616, modulo 97) : une faute de frappe ne passe pas. */
export function ibanValide(saisi: string): boolean {
  const iban = normaliserIban(saisi);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const chiffres = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (lettre) => String(lettre.charCodeAt(0) - 55));
  let reste = 0;
  for (const chiffre of chiffres) reste = (reste * 10 + Number(chiffre)) % 97;
  return reste === 1;
}

/** « BE68539007547034 » devient « BE68 5390 0754 7034 ». */
export function formaterIban(iban: string): string {
  return normaliserIban(iban).replace(/(.{4})(?=.)/g, "$1 ");
}
