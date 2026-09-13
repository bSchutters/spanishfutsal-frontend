import type { CollectionConfig } from 'payload'
import { canWrite, canDelete, isHidden, withFieldPermissions } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  labels: { singular: 'Saison', plural: 'Saisons' },
  admin: {
    useAsTitle: 'name',
    hidden: isHidden('seasons'),
  },
  access: {
    read: () => true,
    create: canWrite('seasons'),
    update: canWrite('seasons'),
    delete: canDelete('seasons'),
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Deactivate all other seasons when one is set to active
        // and auto-archive the previously active season
        if (data?.active) {
          await req.payload.update({
            collection: 'seasons',
            where: { active: { equals: true } },
            data: { active: false, archived: true },
          })
        }
        return data
      },
    ],
    afterChange: [revalidateAfterChange(['seasons', 'rankings', 'matches'])],
    afterDelete: [revalidateAfterDelete(['seasons'])],
  },
  fields: withFieldPermissions('seasons', [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom de la saison',
    },
    {
      name: 'season_id',
      type: 'text',
      required: true,
      label: 'LFFS Season ID',
    },
    {
      name: 'serie_id',
      type: 'text',
      required: true,
      label: 'LFFS Serie ID',
    },
    {
      name: 'serie_name',
      type: 'text',
      label: 'Nom de la serie (ex: P4G)',
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: false,
      label: 'Active',
    },
    {
      name: 'archived',
      type: 'checkbox',
      defaultValue: false,
      label: 'Archivee',
    },
    {
      name: 'start_date',
      type: 'date',
      label: 'Date de debut',
    },
    {
      name: 'end_date',
      type: 'date',
      label: 'Date de fin',
    },
  ]),
}
