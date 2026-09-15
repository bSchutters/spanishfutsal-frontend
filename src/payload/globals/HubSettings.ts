import type { GlobalConfig } from 'payload'

import { accesHub, adminSeulement } from '@/hub/droits'
import { adminGlobalHub, validerHeure } from '../collections/hub/partage'

/** Les reglages generaux du Hub, lus par le calendrier, les flux et les rappels. */
export const HubSettings: GlobalConfig = {
  slug: 'hub-settings',
  label: 'Reglages du Hub',
  admin: adminGlobalHub,
  access: {
    read: accesHub,
    update: adminSeulement,
  },
  fields: [
    {
      name: 'timezone',
      type: 'text',
      required: true,
      defaultValue: 'Europe/Brussels',
      label: 'Fuseau horaire',
      admin: { description: "Fuseau d'affichage et de calcul." },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'match_duration_minutes',
          type: 'number',
          required: true,
          defaultValue: 75,
          min: 1,
          label: "Duree d'un match (minutes)",
          admin: { width: '33%' },
        },
        {
          name: 'match_meeting_offset_minutes',
          type: 'number',
          required: true,
          defaultValue: 45,
          min: 0,
          label: "Rendez-vous avant le coup d'envoi (minutes)",
          admin: { width: '33%' },
        },
        {
          name: 'training_duration_minutes',
          type: 'number',
          required: true,
          defaultValue: 90,
          min: 1,
          label: "Duree d'un entrainement (minutes)",
          admin: { width: '33%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'morning_reminder_time',
          type: 'text',
          required: true,
          defaultValue: '09:00',
          label: 'Rappel du matin',
          validate: validerHeure,
          admin: { width: '50%', description: "HH:mm, le jour de l'evenement." },
        },
        {
          name: 'reminder_before_minutes',
          type: 'number',
          required: true,
          defaultValue: 60,
          min: 1,
          label: "Rappel avant l'evenement (minutes)",
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'club_display_name',
          type: 'text',
          required: true,
          defaultValue: 'UD Asturiana',
          label: 'Nom du club affiche',
          admin: { width: '50%', description: 'Dans les titres et les legendes generees.' },
        },
        {
          name: 'club_match_pattern',
          type: 'text',
          required: true,
          defaultValue: 'ASTURIANA',
          label: 'Motif de reconnaissance du club',
          admin: {
            width: '50%',
            description:
              'Repli pour detecter domicile ou exterieur dans un match LFFS quand la collection Equipes ne suffit pas.',
          },
        },
      ],
    },
  ],
}
