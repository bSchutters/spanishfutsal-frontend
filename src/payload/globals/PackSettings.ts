import type { GlobalConfig } from 'payload'

import { editionModule, lectureModule } from '@/hub/droits'
import { adminGlobalHub } from '../collections/hub/partage'
import { genererJeton } from '../collections/hub/Feeds'

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
      name: 'token',
      type: 'text',
      label: 'Jeton du lien',
      // Genere au premier enregistrement, jamais saisi a la main : le Hub le
      // remplace quand on regenere le lien.
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' && value.length > 0 ? value : genererJeton())],
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
  ],
}
