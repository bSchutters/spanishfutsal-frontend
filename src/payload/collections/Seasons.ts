import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: {
    useAsTitle: 'name',
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
      label: 'Nom de la saison',
    },
    {
      name: 'season_id',
      type: 'text',
      required: true,
      label: 'LFFS Season ID',
    },
    {
      name: 'serie_id',
      type: 'text',
      required: true,
      label: 'LFFS Serie ID',
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: false,
      label: 'Active',
    },
    {
      name: 'archived',
      type: 'checkbox',
      defaultValue: false,
      label: 'Archivee',
    },
    {
      name: 'start_date',
      type: 'date',
      label: 'Date de debut',
    },
    {
      name: 'end_date',
      type: 'date',
      label: 'Date de fin',
    },
  ],
}
