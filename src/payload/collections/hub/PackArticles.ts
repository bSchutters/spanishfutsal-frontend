import type { CollectionConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { LIBELLES_MODE_REMISE, MODES_REMISE } from '@/hub/pack/schema'
import { adminHub } from './partage'

/**
 * Le catalogue du Pack : les articles Joma que les joueurs peuvent
 * commander. Une couleur est une variante de l'article, avec son code
 * couleur Joma et ses photos : la reference complete chez Joma est celle du
 * modele, un point, le code couleur (« 104263.339 »).
 *
 * Le prix est celui du catalogue Joma. Le joueur paie ce prix moins la
 * remise du club : la generale des reglages, aucune, ou celle de l'article.
 *
 * Un article se retire de la page des joueurs en decochant Actif, ou se
 * supprime depuis le Hub. Dans les deux cas, les commandes deja passees
 * gardent leurs lignes : chacune porte sa copie du nom, de la couleur, de
 * la reference et du prix.
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
    delete: editionModule('pack'),
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
        // La premiere photo a sa colonne, les suivantes leur liste : le Hub
        // les montre comme une seule suite, la principale en tete.
        { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo principale' },
        { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 9, label: 'Autres photos' },
        {
          name: 'back_photo_id',
          type: 'number',
          label: 'Photo de dos (identifiant du media)',
          admin: { description: 'L une des photos de la couleur, celle qui porte l apercu du flocage. Se regle dans le Hub.' },
        },
        {
          type: 'row',
          fields: [
            { name: 'flock_fill', type: 'text', label: 'Flocage : lettre', admin: { width: '33%', description: '#fdd700 par defaut.' } },
            { name: 'flock_outline', type: 'text', label: 'Flocage : contour', admin: { width: '33%', description: '#223454 par defaut.' } },
            { name: 'flock_outer', type: 'text', label: 'Flocage : contour exterieur', admin: { width: '33%', description: '#fdd700 par defaut.' } },
          ],
        },
      ],
    },
    {
      name: 'flock_layout',
      type: 'json',
      label: 'Position du flocage sur la photo de dos',
      admin: { description: 'Se regle dans le Hub, avec l apercu.' },
    },
    { name: 'sort_order', type: 'number', defaultValue: 0, label: 'Ordre', admin: { position: 'sidebar' } },
  ],
}
