import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Venues: CollectionConfig = {
  slug: 'venues',
  admin: {
    useAsTitle: 'short_name',
    defaultColumns: ['short_name', 'city', 'street', 'zip'],
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
      name: 'short_name',
      type: 'text',
      required: true,
      label: 'Nom court',
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Reference',
    },
    {
      name: 'street',
      type: 'text',
      label: 'Rue',
    },
    {
      name: 'street2',
      type: 'text',
      label: 'Numero',
    },
    {
      name: 'zip',
      type: 'text',
      label: 'Code postal',
    },
    {
      name: 'city',
      type: 'text',
      label: 'Ville',
    },
    {
      name: 'country',
      type: 'text',
      label: 'Pays',
    },
    {
      name: 'lffs_id',
      type: 'number',
      unique: true,
      label: 'LFFS ID',
    },
  ],
}
