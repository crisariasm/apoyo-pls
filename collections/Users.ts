import type { Access, CollectionAfterReadHook, CollectionConfig } from 'payload'

import { isPayloadAdminUser, roles, type StaffRole } from '../lib/access'
import { auditLogin, auditLogout } from '../lib/audit-log'

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

function redactAuthUser(user: Record<string, unknown>) {
  for (const key of ['password', 'hash', 'salt', 'sessions', 'resetPasswordToken', 'resetPasswordExpiration', 'apiKey']) {
    delete user[key]
  }
}

const AUTH_RESPONSE_REDACTED = 'users.authResponseRedacted'

const redactAuthLoginUser = ({ user, req }: { user: Record<string, unknown>; req: { context: Record<string, unknown> } }) => {
  redactAuthUser(user)
  req.context[AUTH_RESPONSE_REDACTED] = true
  return user
}

const redactAuthReadUser: CollectionAfterReadHook = ({ doc, req }) => {
  if (req.context[AUTH_RESPONSE_REDACTED] && doc && typeof doc === 'object') redactAuthUser(doc as Record<string, unknown>)
  return doc
}

const redactAuthResponse = ({ response }: { response: unknown }) => {
  if (response && typeof response === 'object') {
    const user = (response as { user?: unknown }).user
    if (user && typeof user === 'object') redactAuthUser(user as Record<string, unknown>)
  }
  return response
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
  hooks: {
    afterLogin: [auditLogin, redactAuthLoginUser],
    afterLogout: [auditLogout],
    afterRead: [redactAuthReadUser],
    afterMe: [redactAuthResponse],
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
