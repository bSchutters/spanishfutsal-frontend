import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: { singular: 'Sponsor', plural: 'Sponsors' },
  hooks: {
    afterChange: [revalidateAfterChange(['sponsors'])],
    afterDelete: [revalidateAfterDelete(['sponsors'])],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'url', 'active'],
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
      label: 'Nom du sponsor',
    },
    {
      name: 'url',
      type: 'text',
      label: 'Lien vers le site',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Logo',
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actif',
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Ordre d\'affichage',
    },
  ],
}
