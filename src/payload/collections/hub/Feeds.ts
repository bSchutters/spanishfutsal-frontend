import { randomBytes } from 'node:crypto'
import type { CollectionConfig } from 'payload'

import { adminSeulement, champAdmin, lectureDesFlux } from '@/hub/droits'
import { baseUrlHub } from '@/hub/flux/base-url'
import { adminHub, validerCouleur, validerSlug } from './partage'

/** Trente-deux octets aleatoires, en base64 sans caractere a encoder dans une URL. */
export const genererJeton = () => randomBytes(32).toString('base64url')

/**
 * Un flux est un public : les joueurs, le comite, le pole social. Chaque
 * evenement est rattache a un ou plusieurs flux, et chaque flux se suit depuis
 * l'application calendrier d'un telephone par un lien secret a jeton.
 */
export const Feeds: CollectionConfig = {
  slug: 'feeds',
  labels: { singular: 'Flux', plural: 'Flux' },
  admin: {
    ...adminHub,
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'active', 'alarms'],
    description: "Un flux par public. Le lien d'abonnement et le QR code de chaque flux s'affichent sur sa fiche.",
  },
  access: {
    read: lectureDesFlux,
    create: adminSeulement,
    update: adminSeulement,
    delete: adminSeulement,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Nom', admin: { width: '50%' } },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          label: 'Slug',
          validate: validerSlug,
          admin: {
            width: '50%',
            description: 'Sert dans les identifiants du flux. Ne le changez plus une fois le flux partage.',
          },
        },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: { description: "Affichee sur la page d'abonnement." },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'color',
          type: 'text',
          label: 'Couleur',
          validate: validerCouleur,
          admin: { width: '50%', description: 'Au format #rrggbb.' },
        },
        {
          name: 'emoji',
          type: 'text',
          label: 'Emoji',
          maxLength: 8,
          admin: { width: '50%', description: 'Facultatif, place devant les titres dans le flux.' },
        },
      ],
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Jeton',
      // Genere a la creation, jamais saisi a la main. La regeneration passe
      // par le bouton de la fiche, qui remplace la valeur cote serveur.
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' && value.length > 0 ? value : genererJeton())],
      },
      access: {
        read: champAdmin,
        update: () => false,
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Le secret du lien du flux. Regenerer le jeton coupe immediatement les anciens abonnements.',
      },
    },
    {
      name: 'subscription',
      type: 'ui',
      label: 'Abonnement',
      admin: {
        components: {
          Field: {
            path: '@/payload/components/FluxAbonnement',
            clientProps: { baseUrl: baseUrlHub() },
          },
        },
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Actif',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Un flux inactif ne repond plus a personne.' },
    },
    {
      name: 'alarms',
      type: 'checkbox',
      label: 'Alertes dans le calendrier',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          "Ajoute les alertes (VALARM) aux evenements du flux : le telephone sonne le matin et avant l'evenement.",
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordre',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'options',
      type: 'group',
      label: 'Contenu du flux',
      admin: {
        description: 'Ce que les abonnes voient dans chaque evenement. Les notes internes ne sortent jamais.',
      },
      fields: [
        { name: 'show_meeting_time', type: 'checkbox', label: 'Heure de rendez-vous', defaultValue: false },
        { name: 'show_responsibles', type: 'checkbox', label: 'Responsables', defaultValue: false },
        { name: 'show_status', type: 'checkbox', label: 'Statut des posts', defaultValue: false },
        { name: 'show_networks_format', type: 'checkbox', label: 'Reseaux et format des posts', defaultValue: false },
        { name: 'show_caption', type: 'checkbox', label: 'Legende des posts', defaultValue: false },
        { name: 'show_visuals_link', type: 'checkbox', label: 'Lien des visuels', defaultValue: false },
        { name: 'show_hub_link', type: 'checkbox', label: "Lien vers l'evenement dans le Hub", defaultValue: false },
      ],
    },
  ],
}
