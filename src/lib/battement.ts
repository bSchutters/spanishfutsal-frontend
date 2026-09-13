/**
 * Le rythme du signe de vie des spectateurs.
 *
 * Isole dans son propre fichier parce qu'il est lu des deux cotes : par le
 * lecteur, dans le navigateur, et par le comptage, sur le serveur. L'importer
 * depuis le module de comptage embarquerait le client Payload dans le paquet
 * envoye au visiteur.
 */

/** Intervalle entre deux battements, en secondes. */
export const BATTEMENT_S = 45;

/**
 * Au-dela de ce nombre de battements manques, le spectateur n'est plus compte
 * comme present. Deux et demi : un onglet ferme ne previent pas toujours, et un
 * reseau de salle laisse tomber des requetes.
 */
export const TOLERANCE_BATTEMENTS = 2.5;
