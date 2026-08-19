import type { Access, Where } from 'payload'

export const roles = [
  'admin',
  'super-admin',
  'que-tenemos',
  'que-necesitamos',
  'anuncios-boletin',
  'servicios',
  'inventario',
  'distribucion',
  'comunicados',
  'administracion',
] as const

export type StaffRole = (typeof roles)[number]

export const isPayloadAdminUser = ({ req }: { req: { user?: { role?: string } | null } }) => {
  const role = (req.user as { role?: string } | undefined)?.role
  return Boolean(req.user && ['admin', 'super-admin'].includes(role || ''))
}

// El portal operativo usa overrideAccess después de validar su propio rol y módulo.
// Estas reglas mantienen el API de Payload reservado para admin y super-admin.
export const isCoordinator = isPayloadAdminUser
export const canManageAidIntakes = isPayloadAdminUser
export const canManageNeeds = isPayloadAdminUser
export const canManageInventory = isPayloadAdminUser
export const canManageDistribution = isPayloadAdminUser
export const canManageServices = isPayloadAdminUser
export const canManageNotices = isPayloadAdminUser
export const canManageActivities = isPayloadAdminUser
export const canPublish = isPayloadAdminUser

export const publicVisibleRead: Access = ({ req }) => isPayloadAdminUser({ req }) ? true : { publicVisible: { equals: true } }
const publishedPublicWhere: Where = { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] }
const openPublicWhere: Where = { and: [{ status: { in: ['abierta', 'entregado', 'en-ruta'] } }, { publicVisible: { equals: true } }] }

export const publicStatusRead: Access = ({ req }) => isPayloadAdminUser({ req }) ? true : publishedPublicWhere
export const publicOpenStatusRead: Access = ({ req }) => isPayloadAdminUser({ req }) ? true : openPublicWhere
