import type { CollectionConfig } from 'payload'

import { accesHub, adminSeulement } from '@/hub/droits'
import { adminHub, validerCouleur } from './partage'

export const CATEGORIES = [
  { label: 'Post', value: 'post' },
  { label: 'Match', value: 'match' },
  { label: 'Entrainement', value: 'training' },
  { label: 'Autre', value: 'other' },
] as const

export type Categorie = (typeof CATEGORIES)[number]['value']

/**
 * Le type d'un evenement determine sa couleur dans le calendrier, ses flux
 * par defaut et, par sa categorie, les champs que le formulaire affiche.
 */
export const EventTypes: CollectionConfig = {
  slug: 'event-types',
  labels: { singular: "Type d'evenement", plural: "Types d'evenement" },
  admin: {
    ...adminHub,
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'color', 'order'],
  },
  access: {
    read: accesHub,
    create: adminSeulement,
    update: adminSeulement,
    delete: adminSeulement,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Nom', admin: { width: '50%' } },
        {
          name: 'category',
          type: 'select',
          required: true,
          label: 'Categorie',
          options: [...CATEGORIES],
          admin: { width: '50%', description: 'Determine les champs proposes a la creation.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'color',
          type: 'text',
          label: 'Couleur',
          validate: validerCouleur,
          admin: { width: '50%', description: 'Couleur dans le calendrier, au format #rrggbb.' },
        },
        { name: 'emoji', type: 'text', label: 'Emoji', maxLength: 8, admin: { width: '50%' } },
      ],
    },
    {
      name: 'default_feeds',
      type: 'relationship',
      relationTo: 'feeds',
      hasMany: true,
      label: 'Flux par defaut',
      admin: { description: 'Pre-coches a la creation, modifiables ensuite.' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordre',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
