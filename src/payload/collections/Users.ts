import type { BasePayload, CollectionConfig, Field } from 'payload'
import { APIError } from 'payload'

import { fieldsGroupName, isAdmin, isAdminField, PERMISSION_OPTIONS } from '../access'
import { MANAGED } from '../managed'

/**
 * Compte les administrateurs sans tenir compte des droits de l'appelant :
 * `req` n'est volontairement pas transmis, sinon un manager compterait zero.
 */
const countAdmins = async (payload: BasePayload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { role: { equals: 'admin' } },
  })
  return totalDocs
}

/**
 * Un bloc repliable par collection : le niveau d'acces, puis la liste de ses
 * champs en cases a cocher. Replie par defaut, sinon la fiche ferait plusieurs
 * ecrans ; les cases n'apparaissent qu'une fois la collection accordee.
 */
const permissionBlocks: Field[] = MANAGED.map(({ slug, label, fields }) => ({
  type: 'collapsible',
  label,
  admin: { initCollapsed: true },
  fields: [
    {
      name: slug,
      type: 'select',
      label: "Niveau d'acces",
      defaultValue: 'none',
      options: PERMISSION_OPTIONS,
    },
    {
      name: fieldsGroupName(slug),
      type: 'group',
      label: 'Champs modifiables',
      admin: {
        description:
          'Decochez ce que cette personne ne doit pas pouvoir modifier. Un champ decoche lui apparait grise.',
        // Inutile tant que la collection elle-meme n'est pas accordee.
        condition: (data) => (data?.permissions?.[slug] ?? 'none') !== 'none',
      },
      fields: fields.map(({ name, label: fieldLabel }) => ({
        name,
        type: 'checkbox' as const,
        label: fieldLabel,
        defaultValue: true,
        admin: { width: '33%' },
      })),
    },
  ],
}))

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Manager can only read their own account
      if (user) return { id: { equals: user.id } }
      return false
    },
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      // Manager can only update their own account
      if (user) return { id: { equals: user.id } }
      return false
    },
    delete: isAdmin,
  },
  /**
   * Deux verrous contre l'enfermement dehors. Le champ `role` est deja reserve
   * aux administrateurs, mais rien n'empechait un administrateur de se
   * retrograder lui-meme : la collection disparaissait alors de son menu et le
   * champ devenait verrouille pour lui, sans plus personne pour le corriger.
   */
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc, operation }) => {
        if (operation !== 'update' || !originalDoc) return data

        const perdSonRoleAdmin =
          originalDoc.role === 'admin' && data.role !== undefined && data.role !== 'admin'
        if (!perdSonRoleAdmin) return data

        if (req.user && String(req.user.id) === String(originalDoc.id)) {
          throw new APIError(
            "Vous ne pouvez pas retirer votre propre role d'administrateur. Demandez a un autre administrateur de le faire.",
            403,
          )
        }

        if ((await countAdmins(req.payload)) <= 1) {
          throw new APIError(
            "Ce compte est le dernier administrateur. Nommez d'abord quelqu'un d'autre administrateur.",
            403,
          )
        }

        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        const compte = await req.payload.findByID({ collection: 'users', id })
        if (compte?.role !== 'admin') return

        if (req.user && String(req.user.id) === String(id)) {
          throw new APIError('Vous ne pouvez pas supprimer votre propre compte.', 403)
        }

        if ((await countAdmins(req.payload)) <= 1) {
          throw new APIError(
            'Ce compte est le dernier administrateur, il ne peut pas etre supprime.',
            403,
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'manager',
      label: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
      ],
      admin: {
        description:
          "Un administrateur a acces a tout, y compris aux utilisateurs et aux parametres. Un manager n'a que ce qui est regle ci-dessous.",
      },
      access: {
        update: isAdminField,
      },
    },
    {
      name: 'permissions',
      type: 'group',
      label: 'Acces par section',
      admin: {
        description:
          "Ce que cette personne peut faire dans l'administration. Une section laissee sur aucun acces disparait de son menu.",
        // Inutile d'afficher la matrice pour un administrateur : il a deja tout.
        condition: (data) => data?.role !== 'admin',
      },
      // Sans ce verrou, un manager pourrait s'accorder lui-meme les droits qui
      // lui manquent en modifiant sa propre fiche.
      access: {
        update: isAdminField,
      },
      fields: permissionBlocks,
    },
  ],
}
