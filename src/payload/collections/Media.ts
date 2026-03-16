import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrManager } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Medias' },
  upload: {
    mimeTypes: ['image/*'],
  },
  access: {
    read: () => true,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
