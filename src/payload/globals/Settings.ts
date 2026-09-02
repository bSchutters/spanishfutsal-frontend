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
      name: 'force_live_check',
      type: 'checkbox',
      defaultValue: false,
      label: 'Verifier le direct XbotGo maintenant',
      admin: {
        description:
          "Le site ne cherche une diffusion qu'autour du coup d'envoi. Cochez cette case pour qu'il interroge tout de suite la salle XbotGo du prochain match, le temps d'un essai en arrivant. Sans effet sur YouTube, dont la recherche reste limitee a sa fenetre pour ne pas gaspiller le quota. Pensez a decocher ensuite.",
      },
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
