import type { Access } from 'payload'

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}

export const isAdminOrManager: Access = ({ req: { user } }) => {
  return user?.role === 'admin' || user?.role === 'manager'
}
