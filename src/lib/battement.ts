/**
 * Le rythme du signe de vie des spectateurs.
 *
 * Isole dans son propre fichier parce qu'il est lu des deux cotes : par le
 * lecteur, dans le navigateur, et par le comptage, sur le serveur. L'importer
 * depuis le module de comptage embarquerait le client Payload dans le paquet
 * envoye au visiteur.
 */

/**
 * Intervalle entre deux battements, en secondes.
 *
 * C'est aussi la precision de toutes les durees mesurees : trente secondes
 * plutot que quarante-cinq, parce que le temps regarde par personne se lit au
 * dixieme de minute dans le rapport et qu'une precision plus grossiere que
 * l'affichage est une precision qui ment.
 */
export const BATTEMENT_S = 30;

/**
 * Au-dela de ce nombre de battements manques, le spectateur n'est plus compte
 * comme present.
 *
 * Deux suffisent depuis que le depart s'annonce : ce delai ne sert plus qu'aux
 * cas ou personne n'a pu prevenir, panne de reseau ou navigateur ferme d'un
 * coup. Une minute, donc, au lieu de deux.
 */
export const TOLERANCE_BATTEMENTS = 2;

/**
 * Au-dela de ce temps passe a l'arriere-plan, on cesse de compter.
 *
 * Un onglet cache continue de jouer le son : quelqu'un qui ecoute le match en
 * travaillant est un spectateur, et le faire disparaitre du compteur etait
 * faux. Un onglet oublie ouvert toute la soiree, en revanche, n'est personne.
 * Cinq minutes separent les deux.
 */
export const ABSENCE_MAX_MS = 5 * 60 * 1000;
