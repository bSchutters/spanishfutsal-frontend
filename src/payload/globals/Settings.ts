import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Parametres',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  fields: [
    {
      name: 'imports',
      type: 'checkbox',
      defaultValue: true,
      label: 'Auto-import actif',
    },
    {
      name: 'lffs_token',
      type: 'text',
      label: 'Token LFFS (manuel)',
      admin: {
        description: 'Laisser vide pour utiliser le scraping automatique du token.',
      },
    },
    {
      name: 'cached_lffs_token',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'cached_lffs_token_at',
      type: 'text',
      admin: { hidden: true },
    },
  ],
}
