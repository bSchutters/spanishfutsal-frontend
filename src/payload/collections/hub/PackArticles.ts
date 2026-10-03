import type { CollectionConfig } from 'payload'

import { adminSeulement, editionModule, lectureModule } from '@/hub/droits'
import { LIBELLES_MODE_REMISE, MODES_REMISE } from '@/hub/pack/schema'
import { adminHub } from './partage'

/**
 * Le catalogue du Pack : les articles Joma que les joueurs peuvent
 * commander. Une couleur est une variante de l'article, avec son code
 * couleur Joma et sa photo : la reference complete chez Joma est celle du
 * modele, un point, le code couleur (« 104263.339 »).
 *
 * Le prix est celui du catalogue Joma. Le joueur paie ce prix moins la
 * remise du club : la generale des reglages, aucune, ou celle de l'article.
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
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Nom', admin: { width: '66%' } },
        {
          name: 'reference',
          type: 'text',
          label: 'Reference Joma du modele',
          admin: { width: '34%', description: 'Par exemple 104263.' },
        },
      ],
    },
    { name: 'description', type: 'textarea', label: 'Description' },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number', required: true, min: 0, label: 'Prix catalogue (EUR)', admin: { width: '33%', step: 0.01 } },
        { name: 'flockable', type: 'checkbox', defaultValue: false, label: 'Floquable', admin: { width: '33%' } },
        { name: 'active', type: 'checkbox', defaultValue: true, label: 'Actif', admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'discount_mode',
          type: 'select',
          required: true,
          defaultValue: 'general',
          label: 'Remise',
          options: MODES_REMISE.map((value) => ({ label: LIBELLES_MODE_REMISE[value], value })),
          admin: { width: '50%' },
        },
        {
          name: 'custom_discount',
          type: 'number',
          min: 0,
          max: 100,
          label: 'Remise particuliere (%)',
          admin: { width: '50%', condition: (data) => data?.discount_mode === 'custom' },
        },
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
            // La colonne garde son nom de premiere version, mais porte le code couleur.
            {
              name: 'reference',
              type: 'text',
              label: 'Code couleur Joma',
              admin: { width: '50%', description: 'Par exemple 339, pour 104263.339.' },
            },
          ],
        },
        { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
      ],
    },
    { name: 'sort_order', type: 'number', defaultValue: 0, label: 'Ordre', admin: { position: 'sidebar' } },
  ],
}
