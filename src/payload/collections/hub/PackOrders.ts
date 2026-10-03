import type { CollectionConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { LIBELLES_STATUT_COMMANDE, STATUTS_COMMANDE } from '@/hub/pack/schema'
import { adminHub } from './partage'

/**
 * Les commandes du Pack. Elles arrivent de la page des joueurs, ecrites en
 * systeme apres verification du lien, du mot de passe et du catalogue ; le
 * club les corrige ensuite depuis le Hub. Chaque ligne garde le nom, la
 * couleur, la reference et le prix du moment : le catalogue peut changer
 * sans reecrire une commande deja passee.
 *
 * Rien ne se supprime depuis le Hub : une commande abandonnee passe en
 * Annulee.
 */
export const PackOrders: CollectionConfig = {
  slug: 'pack-orders',
  labels: { singular: 'Commande du pack', plural: 'Commandes du pack' },
  admin: {
    ...adminHub,
    useAsTitle: 'other_name',
    defaultColumns: ['player', 'other_name', 'total', 'status', 'createdAt'],
  },
  access: {
    read: lectureModule('pack'),
    create: editionModule('pack'),
    update: editionModule('pack'),
    delete: editionModule('pack'),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'player', type: 'relationship', relationTo: 'players', label: 'Joueur', admin: { width: '50%' } },
        {
          name: 'other_name',
          type: 'text',
          label: 'Nom (autre)',
          admin: { width: '50%', description: 'Quand la personne n est pas dans l effectif.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', label: 'Telephone', admin: { width: '50%' } },
        { name: 'email', type: 'text', label: 'E-mail', admin: { width: '50%' } },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      minRows: 1,
      label: 'Articles',
      labels: { singular: 'Article', plural: 'Articles' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'article', type: 'relationship', relationTo: 'pack-articles', label: 'Article', admin: { width: '50%' } },
            { name: 'variant_id', type: 'text', label: 'Couleur (identifiant)', admin: { width: '50%', readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'article_name', type: 'text', label: 'Nom de l article', admin: { width: '33%' } },
            { name: 'color', type: 'text', label: 'Couleur', admin: { width: '33%' } },
            { name: 'reference', type: 'text', label: 'Reference Joma', admin: { width: '33%' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'size', type: 'text', label: 'Taille', admin: { width: '25%' } },
            { name: 'quantity', type: 'number', min: 1, label: 'Quantite', admin: { width: '25%' } },
            { name: 'flock_number', type: 'text', label: 'Numero floque', admin: { width: '25%' } },
            { name: 'flock_name', type: 'text', label: 'Nom floque', admin: { width: '25%' } },
          ],
        },
        { name: 'unit_price', type: 'number', min: 0, label: 'Prix unitaire (EUR)' },
      ],
    },
    { name: 'note', type: 'textarea', label: 'Remarque du joueur' },
    { name: 'total', type: 'number', label: 'Total (EUR)', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      label: 'Statut',
      options: STATUTS_COMMANDE.map((value) => ({ label: LIBELLES_STATUT_COMMANDE[value], value })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'ordered_at',
      type: 'date',
      label: 'Commandee chez Joma le',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
  ],
}
