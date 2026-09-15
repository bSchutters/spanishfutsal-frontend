import type { CollectionConfig } from 'payload'
import { canWrite, canDelete, isAuthenticated, isHidden, withFieldPermissions } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: { singular: 'Equipe', plural: 'Equipes' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'lffs_names', 'logo', 'is_club'],
    description:
      'Chaque equipe rencontree en championnat ou en coupe. Le nom LFFS est celui recu de la federation, le nom affiche et le logo sont ceux utilises sur le site.',
    hidden: isHidden('teams'),
  },
  access: {
    read: isAuthenticated,
    create: canWrite('teams'),
    update: canWrite('teams'),
    delete: canDelete('teams'),
  },
  hooks: {
    afterChange: [revalidateAfterChange(['teams', 'matches', 'rankings'])],
    afterDelete: [revalidateAfterDelete(['teams', 'matches', 'rankings'])],
  },
  fields: withFieldPermissions('teams', [
    {
      name: 'lffs_names',
      type: 'text',
      hasMany: true,
      required: true,
      label: 'Noms LFFS',
      admin: {
        description:
          "Nom(s) exact(s) recus de la LFFS. Ajoutez-en plusieurs si l'equipe apparait sous differentes appellations.",
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom affiche',
    },
    {
      name: 'short_name',
      type: 'text',
      label: 'Nom court',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
    },
    {
      name: 'is_club',
      type: 'checkbox',
      defaultValue: false,
      label: 'Equipe du club',
      admin: {
        description: "Met l'equipe en evidence dans le classement et les rencontres.",
      },
    },
  ]),
}
