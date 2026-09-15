import type { CollectionConfig } from 'payload'

import { adminSeulement } from '@/hub/droits'
import { adminHub } from './partage'

/**
 * Une ligne par rappel envoye, ou tente. L'index unique sur l'evenement,
 * l'occurrence, le type de rappel et le destinataire est pose dans la
 * migration : c'est lui qui interdit d'envoyer deux fois le meme rappel,
 * meme si deux executions du job se chevauchent.
 */
export const NotificationLog: CollectionConfig = {
  slug: 'notification-log',
  labels: { singular: 'Rappel envoye', plural: 'Journal des rappels' },
  admin: {
    ...adminHub,
    defaultColumns: ['event', 'occurrence', 'reminder_type', 'user', 'sent_at', 'result'],
    description: 'Les rappels push envoyes. Sert a ne jamais envoyer deux fois le meme.',
  },
  access: {
    read: adminSeulement,
    create: adminSeulement,
    update: adminSeulement,
    delete: adminSeulement,
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
      label: 'Evenement',
    },
    {
      name: 'occurrence',
      type: 'date',
      required: true,
      label: 'Occurrence',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: "La date de l'occurrence, pour les recurrences.",
      },
    },
    {
      name: 'reminder_type',
      type: 'select',
      required: true,
      label: 'Type de rappel',
      options: [
        { label: 'Le matin', value: 'morning' },
        { label: "Avant l'evenement", value: 'before' },
      ],
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Destinataire',
    },
    {
      name: 'sent_at',
      type: 'date',
      label: 'Envoye le',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'result', type: 'text', label: 'Resultat' },
  ],
}
