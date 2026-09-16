import type { Access, CollectionConfig } from 'payload'

import { editionModule, estAdmin, lectureModule } from '@/hub/droits'
import { adminHub } from './partage'

/** Celui qui a depose le fichier le retire, l'administrateur aussi. */
const deposantOuAdmin: Access = ({ req: { user } }) => {
  if (estAdmin(user)) return true
  if (!user) return false
  return { uploaded_by: { equals: user.id } }
}

/**
 * Les visuels des posts, deposes depuis le Hub. A la difference des medias
 * du site, l'original n'est jamais converti ni redimensionne : c'est le
 * fichier tel quel que l'equipe telecharge pour publier. Seule une vignette
 * est derivee, pour les grilles. Les videos passent aussi, sans vignette.
 */
export const HubMedia: CollectionConfig = {
  slug: 'hub-media',
  labels: { singular: 'Visuel du Hub', plural: 'Visuels du Hub' },
  upload: {
    mimeTypes: ['image/*', 'video/*'],
    imageSizes: [
      {
        name: 'vignette',
        width: 480,
        height: 480,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
    ],
    adminThumbnail: 'vignette',
  },
  admin: {
    ...adminHub,
    defaultColumns: ['filename', 'uploaded_by', 'createdAt'],
    description: "Les visuels deposes depuis le Hub, gardes tels quels. Au quotidien, tout se fait depuis le Hub.",
  },
  access: {
    read: lectureModule('calendar'),
    create: editionModule('calendar'),
    update: deposantOuAdmin,
    delete: deposantOuAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user) data.uploaded_by = req.user.id
        return data
      },
    ],
  },
  fields: [
    {
      name: 'uploaded_by',
      type: 'relationship',
      relationTo: 'users',
      label: 'Depose par',
      admin: { readOnly: true },
    },
  ],
}
