import type { CollectionConfig, NumberFieldSingleValidation } from 'payload'
import { canWrite, canDelete, isAuthenticated, isHidden, withFieldPermissions } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'
import { messagePlage, numeroDeMaillot } from '@/hub/joueurs/schema'

/** Un numero de feuille de match reste dans les maillots du poste : le 1 ou le 21 pour un gardien, du 2 au 14 sinon. */
const validerNumeroFeuille: NumberFieldSingleValidation = (value, { siblingData }) => {
  if (value === null || value === undefined) return true
  const gardien = (siblingData as { poste?: string } | undefined)?.poste === 'Gardien'
  return numeroDeMaillot(value, gardien) || messagePlage(gardien)
}

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
      admin: { description: "Le numero affiche sur le site. Rien a voir avec la feuille de match." },
    },
    // Deux champs a plat, pas une ligne : la matrice des droits de la fiche
    // utilisateur ne lit que les champs nommes au premier niveau.
    {
      name: 'numero_feuille_1',
      type: 'number',
      label: 'Feuille de match, numero 1',
      validate: validerNumeroFeuille,
    },
    {
      name: 'numero_feuille_2',
      type: 'number',
      label: 'Feuille de match, numero 2',
      validate: validerNumeroFeuille,
      admin: {
        description:
          "Les deux maillots que ce joueur peut porter : du 2 au 14 pour un joueur de champ, le 1 ou le 21 pour un gardien, deux porteurs au plus par numero. Rien a voir avec le numero du site. Se regle depuis le Hub, page Numeros, qui verifie aussi les porteurs.",
      },
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
  ]),
}
