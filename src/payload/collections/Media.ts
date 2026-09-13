import type { CollectionConfig } from 'payload'
import { canWrite, canDelete, isHidden, withFieldPermissions } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Medias' },
  upload: {
    mimeTypes: ['image/*'],
    /**
     * Conversion a la reception : une photo de telephone de 3 Mo est stockee en
     * WebP d'environ 200 Ko, sans que personne ait a y penser.
     *
     * Les SVG traversent ces reglages sans etre touches : Payload n'applique
     * sharp qu'aux formats matriciels (`canResizeImage`), donc les logos gardent
     * leur nature vectorielle.
     */
    formatOptions: {
      format: 'webp',
      options: { quality: 80 },
    },
    // Plafond volontairement large : Next redimensionne ensuite pour chaque
    // emplacement, la source n'a qu'a couvrir le plus grand usage, les visuels
    // pleine largeur des pages editoriales.
    resizeOptions: {
      width: 1920,
      height: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    },
  },
  admin: {
    hidden: isHidden('media'),
  },
  access: {
    read: () => true,
    create: canWrite('media'),
    update: canWrite('media'),
    delete: canDelete('media'),
  },
  fields: withFieldPermissions('media', [
    {
      name: 'alt',
      type: 'text',
    },
  ]),
}
