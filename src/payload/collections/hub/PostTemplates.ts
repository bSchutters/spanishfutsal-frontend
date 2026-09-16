import type { CollectionConfig } from 'payload'

import { accesHub, adminSeulement } from '@/hub/droits'
import { adminHub, validerHeure } from './partage'

/**
 * Un modele decrit un post genere pour chaque match LFFS : quand le publier
 * par rapport au coup d'envoi, sur quels reseaux, avec quel titre et quelle
 * legende. Les variables entre accolades sont remplacees a la generation.
 */
export const PostTemplates: CollectionConfig = {
  slug: 'post-templates',
  labels: { singular: 'Modele de post', plural: 'Modeles de post' },
  admin: {
    ...adminHub,
    useAsTitle: 'name',
    defaultColumns: ['name', 'active', 'apply_to', 'day_offset'],
    description:
      'Variables disponibles : {adversaire}, {date} (mercredi 16 septembre), {date_courte} (16/09/2026), {heure} (22h00), {heure_rdv}, {salle}, {adresse}, {domicile_exterieur}, {competition}, {score}, {lien_live}, {lien_replay}.',
  },
  access: {
    read: accesHub,
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
          name: 'apply_to',
          type: 'select',
          required: true,
          defaultValue: 'both',
          label: 'Appliquer aux matchs',
          options: [
            { label: 'A domicile', value: 'home' },
            { label: "A l'exterieur", value: 'away' },
            { label: 'Les deux', value: 'both' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'day_offset',
          type: 'number',
          required: true,
          defaultValue: 0,
          label: 'Decalage en jours',
          admin: { width: '33%', description: '-2 pour deux jours avant, 1 pour le lendemain.' },
        },
        {
          name: 'time_mode',
          type: 'select',
          required: true,
          defaultValue: 'fixed_time',
          label: 'Heure',
          options: [
            { label: 'Heure fixe', value: 'fixed_time' },
            { label: "Relative au coup d'envoi", value: 'relative_to_kickoff' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'fixed_time',
          type: 'text',
          label: 'Heure fixe',
          validate: validerHeure,
          admin: {
            width: '33%',
            description: 'HH:mm',
            condition: (_, siblingData) => siblingData?.time_mode !== 'relative_to_kickoff',
          },
        },
        {
          name: 'minute_offset',
          type: 'number',
          label: 'Decalage en minutes',
          admin: {
            width: '33%',
            description: "Par rapport au coup d'envoi, par exemple -120.",
            condition: (_, siblingData) => siblingData?.time_mode === 'relative_to_kickoff',
          },
        },
      ],
    },
    {
      name: 'title_template',
      type: 'text',
      required: true,
      label: 'Titre',
      admin: { description: 'Par exemple : Annonce vs {adversaire}' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'networks',
          type: 'relationship',
          relationTo: 'networks',
          hasMany: true,
          label: 'Reseaux',
          admin: { width: '50%' },
        },
        {
          name: 'format',
          type: 'relationship',
          relationTo: 'formats',
          hasMany: true,
          label: 'Formats',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'feeds',
          type: 'relationship',
          relationTo: 'feeds',
          hasMany: true,
          label: 'Flux',
          admin: { width: '50%' },
        },
        {
          name: 'responsibles',
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
          label: 'Responsables',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'instructions',
      type: 'richText',
      label: 'Instructions',
      admin: { description: 'Copiees dans la description du post genere.' },
    },
    {
      name: 'caption_template',
      type: 'textarea',
      label: 'Legende',
      admin: { description: 'Convention du club : heure au format 22h00, emoji de lieu devant la salle.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Actif',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
