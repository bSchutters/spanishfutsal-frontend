import type { Access, CollectionConfig } from 'payload'

import { estAdmin, lectureModule } from '@/hub/droits'
import { adminHub } from './partage'

/** L'auteur retouche ou retire son commentaire, l'administrateur retire n'importe lequel. */
const auteurOuAdmin: Access = ({ req: { user } }) => {
  if (estAdmin(user)) return true
  if (!user) return false
  return { author: { equals: user.id } }
}

/**
 * Un commentaire se pose sur un evenement ou sur une idee. L'auteur est fixe
 * a la creation depuis la session, jamais depuis les donnees envoyees.
 */
export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Commentaire', plural: 'Commentaires' },
  admin: {
    ...adminHub,
    useAsTitle: 'content',
    defaultColumns: ['content', 'author', 'target', 'createdAt'],
  },
  access: {
    read: lectureModule('calendar'),
    create: lectureModule('calendar'),
    update: auteurOuAdmin,
    delete: auteurOuAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user) {
          data.author = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'target',
      type: 'relationship',
      relationTo: ['events', 'ideas'],
      required: true,
      index: true,
      label: 'Cible',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Auteur',
      access: { update: () => false },
      admin: { readOnly: true },
    },
    { name: 'content', type: 'textarea', required: true, label: 'Contenu' },
  ],
}
