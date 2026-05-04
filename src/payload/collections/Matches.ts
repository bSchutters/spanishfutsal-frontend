import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrManager } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: { singular: 'Match', plural: 'Matchs' },
  hooks: {
    afterChange: [revalidateAfterChange(['matches', 'players'])],
    afterDelete: [revalidateAfterDelete(['matches', 'players'])],
  },
  admin: {
    useAsTitle: 'home_team',
    defaultColumns: ['home_team', 'away_team', 'score_home', 'score_away', 'date', 'serie_reference'],
  },
  access: {
    read: () => true,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'home_team',
      type: 'text',
      required: true,
      label: 'Equipe domicile',
    },
    {
      name: 'away_team',
      type: 'text',
      required: true,
      label: 'Equipe exterieur',
    },
    {
      name: 'score_home',
      type: 'number',
      label: 'Score domicile',
    },
    {
      name: 'score_away',
      type: 'number',
      label: 'Score exterieur',
    },
    {
      name: 'date',
      type: 'date',
      label: 'Date',
    },
    {
      name: 'time',
      type: 'text',
      label: 'Heure (HH:MM:SS)',
    },
    {
      name: 'venue_id',
      type: 'number',
      label: 'ID Salle',
    },
    {
      name: 'venue_name',
      type: 'text',
      label: 'Nom Salle',
    },
    {
      name: 'live_link',
      type: 'text',
      label: 'Lien Live',
    },
    {
      name: 'replay_link',
      type: 'text',
      label: 'Lien Replay',
    },
    {
      name: 'serie_reference',
      type: 'select',
      options: [
        { label: 'P4G', value: 'P4G' },
        { label: 'Coupe', value: 'COUPE' },
        { label: 'Amical', value: 'AMICAL' },
        { label: 'Tournois', value: 'TOURNOIS' },
      ],
      label: 'Competition',
    },
    {
      name: 'season',
      type: 'relationship',
      relationTo: 'seasons',
      label: 'Saison',
    },
    {
      name: 'field_players_stats',
      type: 'array',
      label: 'Stats joueurs de champ',
      fields: [
        {
          name: 'joueur',
          type: 'relationship',
          relationTo: 'players',
          required: true,
          label: 'Joueur',
          filterOptions: {
            poste: { equals: 'Joueur' },
          },
        },
        {
          name: 'goals',
          type: 'number',
          defaultValue: 0,
          label: 'Buts',
        },
        {
          name: 'assists',
          type: 'number',
          defaultValue: 0,
          label: 'Assists',
        },
        {
          name: 'yellow_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons jaunes',
        },
        {
          name: 'red_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons rouges',
        },
      ],
    },
    {
      name: 'goalkeeper_stats',
      type: 'array',
      label: 'Stats gardiens',
      fields: [
        {
          name: 'joueur',
          type: 'relationship',
          relationTo: 'players',
          required: true,
          label: 'Gardien',
          filterOptions: {
            poste: { equals: 'Gardien' },
          },
        },
        {
          name: 'goals',
          type: 'number',
          defaultValue: 0,
          label: 'Buts',
        },
        {
          name: 'assists',
          type: 'number',
          defaultValue: 0,
          label: 'Assists',
        },
        {
          name: 'clean_sheet',
          type: 'checkbox',
          defaultValue: false,
          label: 'Clean sheet',
        },
        {
          name: 'yellow_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons jaunes',
        },
        {
          name: 'red_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons rouges',
        },
      ],
    },
  ],
}
