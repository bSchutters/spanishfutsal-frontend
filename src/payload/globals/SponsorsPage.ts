import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'
import { revalidateGlobalAfterChange } from '../hooks/revalidateCache'

export const SponsorsPage: GlobalConfig = {
  slug: 'sponsors-page',
  label: 'Page Sponsors',
  admin: {
    description: 'Textes de la page /sponsors. Les sponsors eux-memes se gerent dans la collection Sponsors.',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  hooks: {
    afterChange: [revalidateGlobalAfterChange(['sponsors-page'])],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Nos sponsors',
      label: 'Titre de la page',
    },
    {
      name: 'intro',
      type: 'richText',
      label: 'Introduction',
      admin: {
        description: 'Paragraphe affiche sous le titre, avant la liste des sponsors.',
      },
    },
    {
      name: 'sections',
      type: 'array',
      label: 'Sections libres',
      labels: { singular: 'Section', plural: 'Sections' },
      admin: {
        description: 'Blocs de texte affiches sous la liste des sponsors. Glissez pour les reordonner.',
      },
      fields: [
        { name: 'title', type: 'text', label: 'Titre' },
        { name: 'content', type: 'richText', label: 'Contenu' },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Appel a sponsoring',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          label: 'Afficher ce bloc',
        },
        {
          name: 'title',
          type: 'text',
          defaultValue: 'Devenir sponsor',
          label: 'Titre',
        },
        { name: 'text', type: 'textarea', label: 'Texte' },
        {
          name: 'button_label',
          type: 'text',
          defaultValue: 'Nous contacter',
          label: 'Libelle du bouton',
        },
        {
          name: 'button_url',
          type: 'text',
          defaultValue: '/contact',
          label: 'Lien du bouton',
        },
      ],
    },
  ],
}
