import type { Access, FieldAccess } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

export const isAdminOrManager: Access = ({ req: { user } }) => {
  return user?.role === 'admin' || user?.role === 'manager'
}

export const isAdminField: FieldAccess = ({ req: { user } }) => {
  return user?.role === 'admin'
}
