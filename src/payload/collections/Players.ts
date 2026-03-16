import type { CollectionConfig } from 'payload'
import { isAdminOrManager } from '../access'

export const Players: CollectionConfig = {
  slug: 'players',
  labels: { singular: 'Joueur', plural: 'Joueurs' },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['prenom', 'nom', 'numero', 'poste', 'actif'],
  },
  access: {
    read: () => true,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdminOrManager,
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            return `${siblingData?.prenom || ''} ${siblingData?.nom || ''}`.trim()
          },
        ],
      },
    },
    {
      name: 'prenom',
      type: 'text',
      required: true,
      label: 'Prenom',
    },
    {
      name: 'nom',
      type: 'text',
      required: true,
      label: 'Nom',
    },
    {
      name: 'numero',
      type: 'number',
      label: 'Numero',
    },
    {
      name: 'poste',
      type: 'select',
      options: [
        { label: 'Gardien', value: 'Gardien' },
        { label: 'Joueur', value: 'Joueur' },
        { label: 'Coach', value: 'Coach' },
        { label: 'Kine', value: 'Kine' },
      ],
      label: 'Poste',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo',
    },
    {
      name: 'date_naissance',
      type: 'date',
      label: 'Date de naissance',
    },
    {
      name: 'capitaine',
      type: 'checkbox',
      defaultValue: false,
      label: 'Capitaine',
    },
    {
      name: 'actif',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      label: 'Actif',
    },
  ],
}
