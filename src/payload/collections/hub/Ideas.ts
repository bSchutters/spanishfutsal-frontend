import type { CollectionConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { adminHub } from './partage'

export const STATUTS_IDEE = [
  { label: 'Nouvelle', value: 'new' },
  { label: 'Retenue', value: 'kept' },
  { label: 'Ecartee', value: 'discarded' },
] as const

/**
 * Les idees de contenu, en tickets sur un tableau a trois colonnes. Les votes
 * sont indicatifs : ils ne changent jamais le statut tout seuls.
 *
 * Le vote et le commentaire sont ouverts des la lecture : ils passent par
 * des actions du Hub qui verifient le droit et ecrivent elles-memes, la
 * collection ne s'ouvre en modification qu'a l'edition.
 */
export const Ideas: CollectionConfig = {
  slug: 'ideas',
  labels: { singular: 'Idee', plural: 'Idees' },
  admin: {
    ...adminHub,
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'author', 'createdAt'],
  },
  access: {
    read: lectureModule('calendar'),
    create: editionModule('calendar'),
    update: editionModule('calendar'),
    delete: editionModule('calendar'),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user && !data.author) {
          data.author = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Titre' },
    { name: 'description', type: 'richText', label: 'Description' },
    {
      type: 'row',
      fields: [
        {
          name: 'networks',
          type: 'relationship',
          relationTo: 'networks',
          hasMany: true,
          label: 'Reseaux envisages',
          admin: { width: '50%' },
        },
        {
          name: 'format',
          type: 'relationship',
          relationTo: 'formats',
          hasMany: true,
          label: 'Formats envisages',
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'inspiration_link', type: 'text', label: "Lien d'inspiration" },
    {
      name: 'linked_match',
      type: 'relationship',
      relationTo: 'events',
      label: 'Match lie',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: 'Statut',
      options: [...STATUTS_IDEE],
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'planned_post',
      type: 'relationship',
      relationTo: 'events',
      label: 'Post planifie',
      admin: { position: 'sidebar', readOnly: true, description: 'Renseigne par le bouton Planifier.' },
    },
    {
      name: 'votes',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Votes pour',
      admin: { position: 'sidebar', description: 'Un vote par personne, indicatif.' },
    },
    {
      name: 'votes_against',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'Votes contre',
      admin: { position: 'sidebar', description: "Une personne est pour ou contre, jamais les deux." },
    },
  ],
}
