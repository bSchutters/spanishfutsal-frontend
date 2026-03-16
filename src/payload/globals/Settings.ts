import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  fields: [
    {
      name: 'imports',
      type: 'checkbox',
      defaultValue: true,
      label: 'Auto-import active',
    },
    {
      name: 'lffs_token',
      type: 'text',
      label: 'Token LFFS (manuel, si le scraping auto echoue)',
      admin: {
        description: 'Laisser vide pour utiliser le scraping automatique du token.',
      },
    },
  ],
}
