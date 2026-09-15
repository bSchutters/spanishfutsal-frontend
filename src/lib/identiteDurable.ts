/**
 * L'identite qui survit a la fermeture du navigateur.
 *
 * Elle sert a une seule chose : savoir combien de spectateurs reviennent d'un
 * match a l'autre. C'est la seule mesure que le comptage anonyme ne peut pas
 * donner, puisque celui-ci oublie tout a la fermeture de l'onglet.
 *
 * Rien n'est ecrit avant que la personne n'ait ferme le bandeau. C'est le point
 * qui compte : un identifiant qui survit a la session est un suivi, et un suivi
 * se decide avant, pas apres. Tant que le bandeau n'est pas ferme, le site
 * compte comme il l'a toujours fait, en anonyme et le temps d'un onglet.
 *
 * Le numero lui-meme est tire au hasard. Il ne contient ni nom, ni adresse, ni
 * rien qui vienne de l'appareil : deux personnes ne peuvent pas le partager, et
 * personne ne peut remonter de lui a quelqu'un.
 */

/**
 * Exportee : le gabarit pose un script qui lit cette cle avant le premier
 * rendu, pour masquer le bandeau chez ceux qui l'ont deja ferme.
 */
export const CLE_ACCORD = "uda-mesure-lue";
const CLE_IDENTITE = "uda-visiteur-durable";

/** Deux mots de base 36, assez larges pour ne jamais se rencontrer. */
function tirerUnNumero(): string {
  return `${Math.random().toString(36).slice(2, 12)}${Math.random()
    .toString(36)
    .slice(2, 8)}`.replace(/[^a-z0-9]/g, "");
}

/**
 * Les abonnes au changement d'accord.
 *
 * Le stockage du navigateur est une source exterieure a React : on s'y abonne
 * plutot que de le lire dans un effet, faute de quoi le premier rendu affiche
 * une chose et le second une autre.
 */
let ecouteurs: (() => void)[] = [];

export function souscrireALAccord(rappel: () => void): () => void {
  ecouteurs = [...ecouteurs, rappel];
  return () => {
    ecouteurs = ecouteurs.filter((autre) => autre !== rappel);
  };
}

function prevenirLesAbonnes(): void {
  for (const rappel of ecouteurs) rappel();
}

/** Le bandeau a-t-il deja ete ferme sur cet appareil ? */
export function accordDonne(): boolean {
  try {
    return localStorage.getItem(CLE_ACCORD) === "oui";
  } catch {
    // Stockage refuse : on considere que non, et le site compte en anonyme.
    return false;
  }
}

/** Ferme le bandeau et cree l'identite, dans cet ordre et pas avant. */
export function donnerLAccord(): void {
  try {
    localStorage.setItem(CLE_ACCORD, "oui");
    if (!localStorage.getItem(CLE_IDENTITE)) {
      localStorage.setItem(CLE_IDENTITE, tirerUnNumero());
    }
  } catch {
    // Sans stockage, la personne ne sera simplement pas reconnue la prochaine
    // fois. Le bandeau reapparaitra, ce qui est le comportement honnete.
  }

  prevenirLesAbonnes();
}

/** L'identite durable, ou null tant que le bandeau n'a pas ete ferme. */
export function identiteDurable(): string | null {
  try {
    if (!accordDonne()) return null;
    return localStorage.getItem(CLE_IDENTITE);
  } catch {
    return null;
  }
}
