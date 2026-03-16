import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: { singular: 'Equipe', plural: 'Equipes' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'short_name'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom complet',
    },
    {
      name: 'short_name',
      type: 'text',
      label: 'Nom court',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
    },
  ],
}
