import type { CollectionConfig } from 'payload'

import { accesHub, adminSeulement } from '@/hub/droits'
import { adminHub } from './partage'

/** Les formats de publication : post, carrousel, reel, story, live. */
export const Formats: CollectionConfig = {
  slug: 'formats',
  labels: { singular: 'Format', plural: 'Formats' },
  admin: {
    ...adminHub,
    useAsTitle: 'name',
    defaultColumns: ['name', 'active', 'order'],
  },
  access: {
    read: accesHub,
    create: adminSeulement,
    update: adminSeulement,
    delete: adminSeulement,
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nom' },
    {
      name: 'icon',
      type: 'text',
      label: 'Icone',
      admin: { description: "Facultatif : nom d'une icone lucide." },
    },
    { name: 'active', type: 'checkbox', label: 'Actif', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
