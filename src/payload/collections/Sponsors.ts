import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: { singular: 'Sponsor', plural: 'Sponsors' },
  // Ajoute une poignee de glisser-deposer dans la liste : l'ordre defini a la souris
  // est celui de la page /sponsors. Marque experimental par Payload en 3.79.
  orderable: true,
  hooks: {
    afterChange: [revalidateAfterChange(['sponsors'])],
    afterDelete: [revalidateAfterDelete(['sponsors'])],
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'sector', 'active'],
    description:
      "Glissez les lignes pour changer l'ordre d'affichage sur la page sponsors, cliquez sur un sponsor pour le modifier. Utilisez Grouper par > Actif pour separer les sponsors actifs des inactifs.",
    // Active le controle "Grouper par" de la liste : choisi une fois sur Actif, il
    // separe les sponsors en deux sections et le choix est memorise par utilisateur.
    groupBy: true,
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom du sponsor',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Logo',
    },
    {
      name: 'sector',
      type: 'text',
      label: "Secteur d'activite",
      admin: {
        description: 'Affiche comme etiquette sur la fiche. Par exemple : restauration, batiment, assurance.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Quelques lignes de presentation, affichees sous le logo.',
      },
    },
    {
      name: 'links',
      type: 'group',
      label: 'Liens',
      admin: {
        description: "Seuls les liens remplis apparaissent sur la page. Laissez vide ce que le sponsor n'a pas.",
      },
      fields: [
        { name: 'website', type: 'text', label: 'Site web' },
        { name: 'facebook', type: 'text', label: 'Facebook' },
        { name: 'instagram', type: 'text', label: 'Instagram' },
        { name: 'linkedin', type: 'text', label: 'LinkedIn' },
        { name: 'tiktok', type: 'text', label: 'TikTok' },
        { name: 'youtube', type: 'text', label: 'YouTube' },
        { name: 'x', type: 'text', label: 'X (Twitter)' },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Actif',
    },
    {
      name: 'url',
      type: 'text',
      label: 'Lien vers le site (ancien champ)',
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        description: 'Remplace par Liens > Site web. Conserve pour ne pas perdre les valeurs existantes.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: "Ordre d'affichage",
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        description: 'Remplace par le glisser-deposer. Conserve pour ne pas perdre les valeurs existantes.',
      },
    },
  ],
}
