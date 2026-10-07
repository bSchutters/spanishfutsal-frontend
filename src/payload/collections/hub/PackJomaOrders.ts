import type { CollectionConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { adminHub } from './partage'

/**
 * Les commandes passees chez Joma, gardees telles quelles (Bryan, 07/10/2026) :
 * a chaque « Marquer commandees », le recapitulatif du PDF (quantites par
 * reference, nom Joma, couleur et taille), le montant, les commandes des
 * joueurs qu'il couvre et les articles ecartes. Le PDF s'en retelecharge a
 * l'identique, quoi qu'il arrive ensuite au catalogue ou aux commandes.
 *
 * Rien ne s'y modifie : une copie qui changerait ne serait plus une copie.
 */
export const PackJomaOrders: CollectionConfig = {
  slug: 'pack-joma-orders',
  labels: { singular: 'Commande Joma', plural: 'Commandes Joma' },
  admin: {
    ...adminHub,
    useAsTitle: 'ordered_at',
    defaultColumns: ['ordered_at', 'amount', 'createdAt'],
  },
  access: {
    read: lectureModule('pack'),
    create: editionModule('pack'),
    update: () => false,
    delete: editionModule('pack'),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'ordered_at',
      type: 'date',
      required: true,
      label: 'Commandee chez Joma le',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'amount', type: 'number', label: 'Montant des commandes (EUR)' },
    {
      name: 'recap',
      type: 'json',
      required: true,
      label: 'Recapitulatif du PDF',
      admin: { description: 'Commandes, pieces et quantites par reference, couleur et taille, tels que partis chez Joma.' },
    },
    { name: 'order_ids', type: 'json', label: 'Commandes des joueurs couvertes' },
    { name: 'excluded', type: 'json', label: 'Articles ecartes' },
  ],
}
