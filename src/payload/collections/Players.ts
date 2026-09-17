import type { CollectionConfig } from 'payload'
import { canWrite, canDelete, isAuthenticated, isHidden, withFieldPermissions } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'
import { OPTIONS_POSTE } from '@/lib/postes'
export const Players: CollectionConfig = {
  slug: 'players',
  labels: { singular: 'Joueur', plural: 'Joueurs' },
  hooks: {
    afterChange: [revalidateAfterChange(['players'])],
    afterDelete: [revalidateAfterDelete(['players'])],
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['prenom', 'nom', 'numero', 'poste', 'actif'],
    hidden: isHidden('players'),
  },
  access: {
    read: isAuthenticated,
    create: canWrite('players'),
    update: canWrite('players'),
    delete: canDelete('players'),
  },
  fields: withFieldPermissions('players', [
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
      admin: { description: "Le numero du joueur, sur le site comme dans le Hub. Le staff n'en a pas." },
    },
    {
      name: 'poste',
      type: 'select',
      options: OPTIONS_POSTE,
      label: 'Poste',
      admin: { description: "Gardien et Joueur figurent sur la feuille de match, le reste est le staff." },
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
  ]),
}
