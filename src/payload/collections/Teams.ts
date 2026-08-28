import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrManager } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: { singular: 'Equipe', plural: 'Equipes' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'lffs_names', 'logo', 'is_club'],
    description:
      "Chaque equipe rencontree en championnat ou en coupe. Le nom LFFS est celui recu de la federation, le nom affiche et le logo sont ceux utilises sur le site.",
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'manager',
  },
  access: {
    read: () => true,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidateAfterChange(['teams', 'matches', 'rankings'])],
    afterDelete: [revalidateAfterDelete(['teams', 'matches', 'rankings'])],
  },
  fields: [
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
  ],
}
