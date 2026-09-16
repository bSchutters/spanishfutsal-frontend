import type { BasePayload, CollectionConfig, Field } from 'payload'
import { APIError } from 'payload'

import { LIBELLES_NIVEAUX, MODULES, NIVEAUX } from '@/hub/modules'
import { champAdmin, champSoiOuAdmin } from '@/hub/droits'
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

/** Sept jours : la session du Hub se prolonge a chaque visite, voir src/hub/session.ts. */
const SEPT_JOURS_EN_SECONDES = 7 * 24 * 60 * 60

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  auth: {
    tokenExpiration: SEPT_JOURS_EN_SECONDES,
    cookies: {
      // En production le site est en https : le cookie de session ne doit
      // jamais partir en clair. COOKIE_SANS_HTTPS=1 ne sert qu'a essayer une
      // construction de production depuis un telephone, en http sur le
      // reseau local ; a ne jamais poser sur Vercel.
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SANS_HTTPS !== '1',
      sameSite: 'Lax',
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'first_name', 'role'],
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
      type: 'row',
      fields: [
        {
          name: 'first_name',
          type: 'text',
          label: 'Prenom',
          admin: {
            width: '50%',
            description: "Affiche dans le Hub et dans les flux, a la place de l'adresse e-mail.",
          },
        },
        {
          name: 'last_name',
          type: 'text',
          label: 'Nom',
          admin: { width: '50%' },
        },
      ],
    },
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
    /**
     * Le Hub, l'espace prive du club. Un administrateur y a tout sans rien
     * regler ; pour les autres, l'acces, les modules et les flux se donnent
     * ici. Les deux derniers champs sont les seuls que la personne regle
     * elle-meme, depuis son profil dans le Hub.
     */
    {
      name: 'hub',
      type: 'group',
      label: 'Hub',
      admin: {
        description:
          "L'espace prive du club sur /hub. Un administrateur y a acces a tout, cette section ne concerne que les autres comptes.",
        condition: (data) => data?.role !== 'admin',
      },
      fields: [
        {
          name: 'access',
          type: 'checkbox',
          label: 'Acces au Hub',
          defaultValue: false,
          access: { update: champAdmin },
        },
        {
          name: 'modules',
          type: 'array',
          label: 'Modules',
          labels: { singular: 'Module', plural: 'Modules' },
          admin: {
            description: 'Lecture : consulter, voter et commenter. Edition : creer, modifier et supprimer.',
            condition: (data) => data?.hub?.access === true,
          },
          access: { update: champAdmin },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'module',
                  type: 'select',
                  label: 'Module',
                  required: true,
                  options: MODULES.map((module) => ({ label: module.nom, value: module.key })),
                  admin: { width: '50%' },
                },
                {
                  name: 'level',
                  type: 'select',
                  label: 'Niveau',
                  required: true,
                  defaultValue: 'read',
                  options: NIVEAUX.map((niveau) => ({ label: LIBELLES_NIVEAUX[niveau], value: niveau })),
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
        {
          name: 'feeds',
          type: 'relationship',
          relationTo: 'feeds',
          hasMany: true,
          label: 'Flux autorises',
          admin: {
            description: 'Cette personne ne voit que les evenements rattaches a au moins un de ces flux.',
            condition: (data) => data?.hub?.access === true,
          },
          access: { update: champAdmin },
        },
        {
          name: 'push_enabled',
          type: 'checkbox',
          label: 'Notifications push',
          defaultValue: false,
          admin: {
            description: 'Se regle depuis le profil dans le Hub.',
            condition: (data) => data?.hub?.access === true,
          },
          access: { update: champSoiOuAdmin },
        },
        {
          name: 'notified_feeds',
          type: 'relationship',
          relationTo: 'feeds',
          hasMany: true,
          label: 'Flux notifies',
          admin: {
            description:
              'Parmi les flux autorises, ceux dont les rappels lui sont envoyes. Se regle depuis le profil dans le Hub.',
            condition: (data) => data?.hub?.access === true,
          },
          access: { update: champSoiOuAdmin },
        },
      ],
    },
  ],
}
