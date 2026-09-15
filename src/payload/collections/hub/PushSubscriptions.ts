import type { Access, CollectionConfig } from 'payload'

import { accesHub, estAdmin } from '@/hub/droits'
import { adminHub } from './partage'

/** Chacun ne voit et ne gere que ses propres appareils. */
const sienOuAdmin: Access = ({ req: { user } }) => {
  if (estAdmin(user)) return true
  if (!user) return false
  return { user: { equals: user.id } }
}

/**
 * Un abonnement par appareil et par personne : l'adresse a laquelle le
 * service push du navigateur accepte nos notifications, avec ses cles.
 */
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  labels: { singular: 'Abonnement push', plural: 'Abonnements push' },
  admin: {
    ...adminHub,
    useAsTitle: 'endpoint',
    defaultColumns: ['user', 'user_agent', 'last_success', 'createdAt'],
    description: 'Les appareils abonnes aux notifications du Hub. Rien ne se saisit ici a la main.',
  },
  access: {
    read: sienOuAdmin,
    create: accesHub,
    update: sienOuAdmin,
    delete: sienOuAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user && !estAdmin(req.user)) {
          data.user = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Utilisateur',
    },
    { name: 'endpoint', type: 'text', required: true, unique: true, label: 'Adresse' },
    {
      name: 'keys',
      type: 'group',
      label: 'Cles',
      fields: [
        { name: 'p256dh', type: 'text', required: true, label: 'p256dh' },
        { name: 'auth', type: 'text', required: true, label: 'auth' },
      ],
    },
    { name: 'user_agent', type: 'text', label: 'Navigateur' },
    {
      name: 'last_success',
      type: 'date',
      label: 'Dernier envoi reussi',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
