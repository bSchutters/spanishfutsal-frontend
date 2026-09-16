import type { CollectionConfig } from 'payload'

import { editionModule, editionModuleParFlux, lectureModuleParFlux } from '@/hub/droits'
import { adminHub, dateEtHeure } from './partage'

export const STATUTS_POST = [
  { label: 'A creer', value: 'to_create' },
  { label: 'Pret', value: 'ready' },
  { label: 'Publie', value: 'published' },
  { label: 'Annule', value: 'cancelled' },
] as const

export type StatutPost = (typeof STATUTS_POST)[number]['value']

export const JOURS_SEMAINE = [
  { label: 'Lundi', value: 'mon' },
  { label: 'Mardi', value: 'tue' },
  { label: 'Mercredi', value: 'wed' },
  { label: 'Jeudi', value: 'thu' },
  { label: 'Vendredi', value: 'fri' },
  { label: 'Samedi', value: 'sat' },
  { label: 'Dimanche', value: 'sun' },
] as const

/**
 * Tout ce qui se place dans le calendrier : un post a publier, un match, un
 * entrainement, une reunion. Les champs communs viennent d'abord, puis ceux
 * propres aux posts et aux matchs, que le formulaire du Hub n'affiche que
 * selon la categorie du type choisi.
 *
 * Une personne ne voit que les evenements rattaches a l'un de ses flux :
 * les autres n'existent pas pour elle, ni ici, ni dans l'API.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Evenement', plural: 'Evenements' },
  admin: {
    ...adminHub,
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'starts_at', 'status', 'cancelled'],
    description: 'Le calendrier du club. Au quotidien, tout se fait depuis le Hub, cette vue sert de secours.',
  },
  access: {
    read: lectureModuleParFlux('calendar'),
    create: editionModule('calendar'),
    update: editionModuleParFlux('calendar'),
    delete: editionModuleParFlux('calendar'),
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation, originalDoc }) => {
        if (operation === 'create' && req.user && !data.created_by) {
          data.created_by = req.user.id
        }
        // Le flux principal est toujours l'un des flux de l'evenement : le
        // premier quand il manque ou qu'il a ete decoche.
        const flux: unknown[] = Array.isArray(data.feeds) ? data.feeds : Array.isArray(originalDoc?.feeds) ? originalDoc.feeds : []
        const ids = flux.map((f) => String(typeof f === 'object' && f !== null ? (f as { id: unknown }).id : f))
        const principal = data.primary_feed ?? originalDoc?.primary_feed
        const idPrincipal = principal === null || principal === undefined ? null : String(typeof principal === 'object' ? (principal as { id: unknown }).id : principal)
        if (ids.length > 0 && (idPrincipal === null || !ids.includes(idPrincipal))) {
          data.primary_feed = Number(ids[0])
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Evenement',
          fields: [
            { name: 'title', type: 'text', required: true, label: 'Titre' },
            {
              name: 'type',
              type: 'relationship',
              relationTo: 'event-types',
              required: true,
              label: 'Type',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'starts_at',
                  type: 'date',
                  required: true,
                  index: true,
                  label: 'Debut',
                  admin: { ...dateEtHeure, width: '50%' },
                },
                {
                  name: 'ends_at',
                  type: 'date',
                  label: 'Fin',
                  admin: { ...dateEtHeure, width: '50%', description: 'Vide : duree par defaut selon la categorie.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'all_day',
                  type: 'checkbox',
                  label: 'Journee entiere',
                  defaultValue: false,
                  admin: { width: '50%' },
                },
                {
                  name: 'meeting_at',
                  type: 'date',
                  label: 'Heure de rendez-vous',
                  admin: { ...dateEtHeure, width: '50%', description: 'Matchs et entrainements.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'location_name', type: 'text', label: 'Lieu', admin: { width: '50%' } },
                {
                  name: 'location_address',
                  type: 'text',
                  label: 'Adresse',
                  admin: { width: '50%', description: "Le lien vers la carte est genere a l'affichage." },
                },
              ],
            },
            {
              name: 'feeds',
              type: 'relationship',
              relationTo: 'feeds',
              hasMany: true,
              required: true,
              label: 'Flux',
              admin: { description: 'Au moins un. Determine qui voit cet evenement.' },
            },
            {
              name: 'primary_feed',
              type: 'relationship',
              relationTo: 'feeds',
              label: 'Flux principal',
              admin: {
                description: "Donne sa couleur a l'evenement dans le calendrier. L'un des flux ci-dessus, le premier par defaut.",
              },
            },
            {
              name: 'responsibles',
              type: 'relationship',
              relationTo: 'users',
              hasMany: true,
              label: 'Responsables',
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Description',
              admin: { description: 'Visible dans les flux.' },
            },
            {
              name: 'internal_notes',
              type: 'richText',
              label: 'Notes internes',
              admin: { description: 'Hub uniquement, jamais dans les flux.' },
            },
            {
              name: 'recurrence',
              type: 'group',
              label: 'Recurrence',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'frequency',
                      type: 'select',
                      label: 'Frequence',
                      defaultValue: 'none',
                      options: [
                        { label: 'Aucune', value: 'none' },
                        { label: 'Hebdomadaire', value: 'weekly' },
                        { label: 'Mensuelle', value: 'monthly' },
                      ],
                      admin: { width: '50%' },
                    },
                    {
                      name: 'interval',
                      type: 'number',
                      label: 'Toutes les',
                      defaultValue: 1,
                      min: 1,
                      admin: { width: '50%', description: 'N semaines ou N mois.' },
                    },
                  ],
                },
                {
                  name: 'weekdays',
                  type: 'select',
                  hasMany: true,
                  label: 'Jours de la semaine',
                  options: [...JOURS_SEMAINE],
                  admin: { description: 'Pour la recurrence hebdomadaire.' },
                },
                {
                  name: 'until',
                  type: 'date',
                  label: 'Fin de la recurrence',
                  admin: { description: "Obligatoire des qu'il y a une recurrence." },
                },
              ],
            },
          ],
        },
        {
          label: 'Post',
          description: 'Champs des evenements de categorie post.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  label: 'Statut',
                  defaultValue: 'to_create',
                  options: [...STATUTS_POST],
                  admin: { width: '33%' },
                },
                {
                  name: 'format',
                  type: 'relationship',
                  relationTo: 'formats',
                  hasMany: true,
                  label: 'Formats',
                  admin: { width: '33%' },
                },
                {
                  name: 'networks',
                  type: 'relationship',
                  relationTo: 'networks',
                  hasMany: true,
                  label: 'Reseaux',
                  admin: { width: '33%' },
                },
              ],
            },
            {
              name: 'caption',
              type: 'textarea',
              label: 'Legende',
              admin: { description: 'Le texte a copier-coller au moment de publier.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'visuals_link', type: 'text', label: 'Lien des visuels', admin: { width: '50%' } },
                { name: 'publication_link', type: 'text', label: 'Lien de la publication', admin: { width: '50%' } },
              ],
            },
            {
              name: 'visuals',
              type: 'upload',
              relationTo: 'hub-media',
              hasMany: true,
              label: 'Visuels',
              admin: { description: 'Deposes depuis le Hub, gardes tels quels.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'views',
                  type: 'number',
                  label: 'Vues',
                  min: 0,
                  admin: { width: '50%', description: 'Releve a la main.' },
                },
                {
                  name: 'linked_match',
                  type: 'relationship',
                  relationTo: 'events',
                  label: 'Match lie',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'template',
              type: 'relationship',
              relationTo: 'post-templates',
              label: 'Modele',
              admin: { description: 'Renseigne quand le post a ete genere depuis un match.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'date_edited_manually',
                  type: 'checkbox',
                  label: 'Date modifiee a la main',
                  defaultValue: false,
                  admin: { width: '50%', readOnly: true, description: 'Un post deplace a la main ne suit plus le match.' },
                },
                {
                  name: 'caption_edited_manually',
                  type: 'checkbox',
                  label: 'Legende modifiee a la main',
                  defaultValue: false,
                  admin: { width: '50%', readOnly: true, description: "Une legende retouchee n'est plus regeneree." },
                },
              ],
            },
          ],
        },
        {
          label: 'Match',
          description: 'Champs des evenements de categorie match.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'source',
                  type: 'select',
                  label: 'Source',
                  options: [
                    { label: 'LFFS', value: 'lffs' },
                    { label: 'Manuel', value: 'manual' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'lffs_match',
                  type: 'relationship',
                  relationTo: 'matches',
                  label: 'Match LFFS',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'lffs_id',
              type: 'number',
              unique: true,
              index: true,
              label: 'Identifiant LFFS',
              admin: { readOnly: true, description: 'La cle de synchronisation avec la collection Matchs.' },
            },
            {
              type: 'row',
              fields: [
                { name: 'opponent', type: 'text', label: 'Adversaire', admin: { width: '50%' } },
                { name: 'competition', type: 'text', label: 'Competition', admin: { width: '50%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'home', type: 'checkbox', label: 'A domicile', defaultValue: true, admin: { width: '50%' } },
                { name: 'score', type: 'text', label: 'Score', admin: { width: '50%', readOnly: true } },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'cancelled',
      type: 'checkbox',
      label: 'Annule',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'no_reminder',
      type: 'checkbox',
      label: 'Pas de rappel',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Ni notification push, ni alerte dans les flux.' },
    },
    {
      name: 'created_by',
      type: 'relationship',
      relationTo: 'users',
      label: 'Cree par',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
