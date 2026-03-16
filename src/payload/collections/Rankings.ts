import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Rankings: CollectionConfig = {
  slug: 'rankings',
  admin: {
    useAsTitle: 'team_name',
    defaultColumns: ['team_name', 'position', 'points', 'played'],
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'team_name',
      type: 'text',
      required: true,
      label: 'Equipe',
    },
    {
      name: 'position',
      type: 'number',
      label: 'Position',
    },
    {
      name: 'played',
      type: 'number',
      label: 'Matchs joues',
    },
    {
      name: 'points',
      type: 'number',
      label: 'Points',
    },
    {
      name: 'wins',
      type: 'number',
      label: 'Victoires',
    },
    {
      name: 'draws',
      type: 'number',
      label: 'Nuls',
    },
    {
      name: 'losses',
      type: 'number',
      label: 'Defaites',
    },
    {
      name: 'goals_for',
      type: 'number',
      label: 'Buts pour',
    },
    {
      name: 'goals_against',
      type: 'number',
      label: 'Buts contre',
    },
    {
      name: 'goal_difference',
      type: 'number',
      label: 'Difference de buts',
    },
    {
      name: 'result_sequence',
      type: 'text',
      label: 'Sequence resultats',
    },
    {
      name: 'imported_at',
      type: 'date',
      label: 'Importe le',
    },
    {
      name: 'positionChange',
      type: 'select',
      options: [
        { label: 'Inchange', value: 'no_change' },
        { label: 'Monte', value: 'up' },
        { label: 'Descendu', value: 'down' },
      ],
      defaultValue: 'no_change',
      label: 'Changement de position',
    },
    {
      name: 'season',
      type: 'relationship',
      relationTo: 'seasons',
      label: 'Saison',
    },
  ],
}
