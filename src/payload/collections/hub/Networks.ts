import type { CollectionConfig } from 'payload'

import { accesHub, adminSeulement } from '@/hub/droits'
import { adminHub } from './partage'

/** Les reseaux sociaux ou le club publie. */
export const Networks: CollectionConfig = {
  slug: 'networks',
  labels: { singular: 'Reseau', plural: 'Reseaux' },
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
      admin: { description: "Facultatif : nom d'une icone lucide, par exemple instagram." },
    },
    { name: 'active', type: 'checkbox', label: 'Actif', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Ordre', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
