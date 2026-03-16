import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const LffsUpdates: CollectionConfig = {
  slug: 'lffs-updates',
  labels: { singular: 'Import LFFS', plural: 'Imports LFFS' },
  admin: {
    useAsTitle: 'type',
    defaultColumns: ['type', 'status', 'last_update', 'items_processed'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Classement', value: 'ranking' },
        { label: 'Matchs', value: 'matches' },
      ],
      label: 'Type',
    },
    {
      name: 'last_update',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      label: 'Derniere mise a jour',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Succes', value: 'success' },
        { label: 'Erreur', value: 'error' },
        { label: 'En cours', value: 'in_progress' },
      ],
      defaultValue: 'success',
      label: 'Statut',
    },
    {
      name: 'error_message',
      type: 'textarea',
      label: 'Message erreur',
    },
    {
      name: 'items_processed',
      type: 'number',
      label: 'Elements traites',
    },
  ],
}
