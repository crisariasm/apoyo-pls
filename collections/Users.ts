import type { Access, CollectionConfig } from 'payload'

import { isPayloadAdminUser, roles, type StaffRole } from '../lib/access'

const roleLabels: Record<StaffRole, string> = {
  admin: 'Administrador de Payload',
  'super-admin': 'Super administrador de Payload',
  'que-tenemos': 'Rol que tenemos',
  'que-necesitamos': 'Rol que necesitamos',
  anuncios: 'Rol de anuncios del centro',
  boletin: 'Rol de boletín informativo',
  servicios: 'Rol de servicios',
  inventario: 'Rol de inventario',
  distribucion: 'Rol de distribución',
  comunicados: 'Rol de comunicados',
  administracion: 'Rol de administración',
}

const canReadOwnUserOrPayloadAdmin: Access = ({ id, req }) => {
  if (isPayloadAdminUser({ req })) return true
  return Boolean(req.user && req.user.collection === 'users' && id && String(req.user.id) === String(id))
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
    useSessions: true,
    removeTokenFromResponses: true,
    cookies: {
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
    group: 'Equipo PLs al llamado',
  },
  access: {
    admin: isPayloadAdminUser,
    read: canReadOwnUserOrPayloadAdmin,
    create: isPayloadAdminUser,
    update: isPayloadAdminUser,
    delete: isPayloadAdminUser,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nombre completo',
      required: true,
      maxLength: 160,
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rol operativo',
      required: true,
      defaultValue: 'admin',
      admin: { description: 'El primer usuario registrado en Payload debe conservar el rol Administrador.' },
      options: roles.map((role) => ({ label: roleLabels[role], value: role })),
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Teléfono de trabajo',
      maxLength: 40,
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Usuario activo',
      defaultValue: true,
    },
  ],
}
