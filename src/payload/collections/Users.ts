import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
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
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'manager',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
      ],
      access: {
        update: isAdminField,
      },
    },
  ],
}
