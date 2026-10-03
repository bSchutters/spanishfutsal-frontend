import type { CollectionConfig } from 'payload'

import { adminSeulement, editionModule, lectureModule } from '@/hub/droits'
import { adminHub } from './partage'

/**
 * Le catalogue du Pack : les articles Joma que les joueurs peuvent
 * commander. Une couleur est une variante de l'article, avec sa propre
 * reference Joma et sa photo.
 *
 * Un article ne se supprime pas depuis le Hub : on le retire en decochant
 * Actif, il quitte la page des joueurs et reste dans les commandes deja
 * passees. La suppression reste aux administrateurs, dans l'admin.
 */
export const PackArticles: CollectionConfig = {
  slug: 'pack-articles',
  labels: { singular: 'Article du pack', plural: 'Articles du pack' },
  admin: {
    ...adminHub,
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'active', 'sort_order'],
  },
  access: {
    read: lectureModule('pack'),
    create: editionModule('pack'),
    update: editionModule('pack'),
    delete: adminSeulement,
  },
  defaultSort: 'sort_order',
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nom' },
    { name: 'description', type: 'textarea', label: 'Description' },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number', required: true, min: 0, label: 'Prix (EUR)', admin: { width: '33%', step: 0.01 } },
        { name: 'flockable', type: 'checkbox', defaultValue: false, label: 'Floquable', admin: { width: '33%' } },
        { name: 'active', type: 'checkbox', defaultValue: true, label: 'Actif', admin: { width: '33%' } },
      ],
    },
    {
      name: 'sizes',
      type: 'json',
      label: 'Tailles',
      admin: { description: 'La liste des tailles proposees, dans l ordre, par exemple ["S","M","L"].' },
    },
    {
      name: 'variants',
      type: 'array',
      minRows: 1,
      label: 'Couleurs',
      labels: { singular: 'Couleur', plural: 'Couleurs' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'color', type: 'text', label: 'Couleur', admin: { width: '50%' } },
            { name: 'reference', type: 'text', label: 'Reference Joma', admin: { width: '50%' } },
          ],
        },
        { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
      ],
    },
    { name: 'sort_order', type: 'number', defaultValue: 0, label: 'Ordre', admin: { position: 'sidebar' } },
  ],
}
