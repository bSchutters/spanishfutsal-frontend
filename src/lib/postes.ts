/**
 * Les postes d'une fiche joueur, source unique pour la collection Payload,
 * le Hub et le site public.
 *
 * Les valeurs stockees restent sans accent, comme les premieres l'etaient :
 * ce sont des cles, pas du texte. Le libelle accentue ne sert qu'a
 * l'affichage, sur la page Equipe comme dans le Hub.
 *
 * L'ordre de cette liste est celui du club : les deux postes de terrain, puis
 * le staff du plus proche de l'equipe au plus large. Il sert a classer le
 * staff, partout ou il s'affiche.
 */

export const POSTES = ['Gardien', 'Joueur', 'Coach', 'Adjoint', 'Delegue', 'Kine', 'Staff'] as const

export type Poste = (typeof POSTES)[number]

export const LIBELLES_POSTE: Record<Poste, string> = {
  Gardien: 'Gardien',
  Joueur: 'Joueur',
  Coach: 'Coach',
  Adjoint: 'Adjoint',
  Delegue: 'Délégué',
  Kine: 'Kiné',
  Staff: 'Staff',
}

/** Les options du champ `poste`, dans l'ordre du formulaire. */
export const OPTIONS_POSTE = POSTES.map((valeur) => ({ label: LIBELLES_POSTE[valeur], value: valeur }))

/** Gardien ou joueur de champ : sur la feuille de match. Le staff, non. */
export function surLaFeuille(poste: Poste | null | undefined): boolean {
  return poste === 'Gardien' || poste === 'Joueur'
}

/** Le libelle a montrer, ou une chaine vide pour un poste absent ou inconnu. */
export function libellePoste(poste: string | null | undefined): string {
  if (!poste) return ''
  return LIBELLES_POSTE[poste as Poste] ?? poste
}

/** Le rang d'un poste dans la hierarchie du club. Un poste absent ou inconnu passe en dernier. */
export function rangPoste(poste: string | null | undefined): number {
  const rang = POSTES.indexOf(poste as Poste)
  return rang === -1 ? POSTES.length : rang
}
