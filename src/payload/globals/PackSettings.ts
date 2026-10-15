import type { GlobalConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { genererJetonLien } from '@/hub/pack/acces'
import { adminGlobalHub } from '../collections/hub/partage'

/**
 * Les reglages du Pack : la page des joueurs (ouverte ou non, date limite,
 * lien secret, mot de passe) et les prix des flocages, les memes pour tout
 * article floquable. Ils se reglent depuis le Hub, page Catalogue.
 */
export const PackSettings: GlobalConfig = {
  slug: 'pack-settings',
  label: 'Reglages du pack',
  admin: adminGlobalHub,
  access: {
    read: lectureModule('pack'),
    update: editionModule('pack'),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'open', type: 'checkbox', defaultValue: false, label: 'Commandes ouvertes', admin: { width: '50%' } },
        {
          name: 'deadline',
          type: 'date',
          label: 'Date limite',
          admin: { width: '50%', date: { pickerAppearance: 'dayOnly' }, description: 'Dernier jour pour commander. Vide : pas de limite.' },
        },
      ],
    },
    {
      name: 'discount',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      max: 100,
      label: 'Remise generale (%)',
      admin: { description: 'Deduite du prix catalogue de chaque article, sauf exception sur l article.' },
    },
    {
      name: 'token',
      type: 'text',
      label: 'Jeton du lien',
      // Genere au premier enregistrement, jamais saisi a la main : le Hub le
      // remplace quand on regenere le lien.
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' && value.length > 0 ? value : genererJetonLien())],
      },
      admin: { readOnly: true, description: 'Le secret du lien de la page des joueurs.' },
    },
    { name: 'password', type: 'text', label: 'Mot de passe de la page' },
    {
      type: 'row',
      fields: [
        {
          name: 'flock_number_price',
          type: 'number',
          required: true,
          defaultValue: 5,
          min: 0,
          label: 'Flocage du numero (EUR)',
          admin: { width: '50%', step: 0.5 },
        },
        {
          name: 'flock_name_price',
          type: 'number',
          required: true,
          defaultValue: 2.5,
          min: 0,
          label: 'Flocage du nom (EUR)',
          admin: { width: '50%', step: 0.5 },
        },
      ],
    },
    {
      // Montres au joueur une fois sa commande envoyee, avec le montant (Bryan, 15/10/2026).
      type: 'row',
      fields: [
        {
          name: 'payment_iban',
          type: 'text',
          label: 'IBAN du club',
          admin: { width: '50%', description: 'Se regle dans le Hub, page Catalogue. Garde sans espaces.' },
        },
        { name: 'payment_holder', type: 'text', label: 'Titulaire du compte', admin: { width: '50%' } },
      ],
    },
    {
      name: 'people',
      type: 'json',
      label: 'Noms ajoutes a la liste',
      admin: {
        description:
          'Se regle dans le Hub, page Catalogue : les personnes hors effectif qui peuvent commander, par exemple [{"id":"3f9c1e2a","nom":"Jean Dupont"}].',
      },
    },
    {
      name: 'hidden_players',
      type: 'json',
      label: 'Joueurs retires de la liste',
      admin: {
        description: 'Se regle dans le Hub, page Catalogue : les joueurs de l effectif qui ne commandent pas. L effectif du site ne change pas.',
      },
    },
  ],
}
