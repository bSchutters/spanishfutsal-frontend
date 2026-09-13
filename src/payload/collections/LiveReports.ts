import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

/**
 * Le rapport d'audience d'une diffusion, une fiche par rencontre.
 *
 * Les chiffres sont figes ici plutot que recalcules a chaque consultation : le
 * rapport est un compte rendu, il ne doit pas changer de valeur six mois plus
 * tard parce que les traces brutes ont ete purgees. Elles restent disponibles a
 * cote, pour refaire le calcul si la methode evolue.
 *
 * La case d'envoi evite le doublon : la fin d'une diffusion peut etre constatee
 * plusieurs fois, par le dernier visiteur present comme par le rattrapage du
 * matin, et le message ne doit partir qu'une fois.
 */
export const LiveReports: CollectionConfig = {
  slug: 'live-reports',
  labels: { singular: 'Rapport de diffusion', plural: 'Rapports de diffusion' },
  admin: {
    useAsTitle: 'affiche',
    defaultColumns: ['affiche', 'pointe', 'uniques', 'duree_moyenne', 'envoye'],
    hidden: ({ user }) => user?.role !== 'admin',
    description:
      "Ce que chaque diffusion a rassemble. Ces fiches s'ecrivent toutes seules a la fin du direct.",
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      index: true,
      unique: true,
      label: 'Rencontre',
    },
    {
      // Recopiee telle quelle : une fiche de match peut etre corrigee ou
      // supprimee, le rapport doit rester lisible seul.
      name: 'affiche',
      type: 'text',
      required: true,
      label: 'Affiche',
    },
    {
      name: 'debut',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: 'Premier spectateur',
    },
    {
      name: 'fin',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: 'Dernier spectateur',
    },
    {
      name: 'uniques',
      type: 'number',
      label: 'Spectateurs differents',
    },
    {
      // Le chiffre qui compte vraiment : combien de personnes regardaient en
      // meme temps, au meilleur moment.
      name: 'pointe',
      type: 'number',
      label: 'Pointe simultanee',
    },
    {
      name: 'duree_moyenne',
      type: 'number',
      label: 'Duree moyenne (minutes)',
    },
    {
      name: 'part_mobile',
      type: 'number',
      label: 'Part de telephones (%)',
    },
    {
      // Le nombre de spectateurs simultanes minute par minute, pour dessiner la
      // courbe de la soiree sans rouvrir les traces brutes.
      name: 'courbe',
      type: 'json',
      label: 'Courbe par minute',
    },
    {
      name: 'envoye',
      type: 'checkbox',
      defaultValue: false,
      label: 'Rapport envoye',
    },
  ],
}
