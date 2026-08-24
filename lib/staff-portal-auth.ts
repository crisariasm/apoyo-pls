import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import config from '../payload.config'
import { dashboardRoleLabels, dashboardRoleValues, type DashboardRole } from './staff-portal-config'
import { isUUID } from './uuid'

export type PortalUser = {
  collection: 'users'
  id: string
  email: string
  name: string
  role: DashboardRole
  active: boolean
}

export function isDashboardRole(value: unknown): value is DashboardRole {
  return typeof value === 'string' && dashboardRoleValues.includes(value as DashboardRole)
}

function normalizeUser(value: unknown): PortalUser | null {
  if (!value || typeof value !== 'object') return null
  const user = value as Record<string, unknown>
  if (!isDashboardRole(user.role) || user.active === false) return null
  if (typeof user.id !== 'string' || !isUUID(user.id)) return null
  if (typeof user.collection === 'string' && user.collection !== 'users') return null
  return {
    collection: 'users',
    id: user.id,
    email: typeof user.email === 'string' ? user.email : '',
    name: typeof user.name === 'string' && user.name ? user.name : 'Equipo operativo',
    role: user.role,
    active: true,
  }
}

export function isPortalAdministrator(user: PortalUser) {
  return user.role === 'administracion'
}

export function getPortalOwnershipWhere(user: PortalUser, moduleSlug?: string) {
  // La pertenencia al módulo ya se valida antes de llamar esta función.
  // Los registros operativos son compartidos entre las personas autorizadas
  // para el módulo, para que puedan detectar duplicados y continuar el
  // trabajo de otro integrante. registeredByUserId se conserva únicamente
  // como trazabilidad del creador y para los indicadores propios del panel.
  void user
  void moduleSlug
  return undefined
}

export function ownsPortalRecord(user: PortalUser, record: unknown, moduleSlug?: string) {
  // La autorización de rol y módulo ya ocurrió en getAuthorizedModule().
  // Una vez dentro del módulo, el equipo puede mantener registros
  // compartidos. El creador original no se reemplaza: solo se actualiza
  // updatedBy/updatedByUserId cuando otra persona hace un cambio.
  void user
  void record
  void moduleSlug
  return true
}

export function getDashboardRoleLabel(role: DashboardRole) {
  return dashboardRoleLabels[role]
}

export async function getStaffSession(requestHeaders?: HeadersInit) {
  try {
    const payload = await getPayload({ config })
    // En handlers API usamos los headers de la petición explícitamente. En
    // algunos despliegues serverless, depender de next/headers() dentro de una
    // función auxiliar puede perder la cookie aunque la página ya haya
    // autenticado correctamente al usuario.
    const authHeaders = requestHeaders ? new Headers(requestHeaders) : await headers()
    const result = await payload.auth({ headers: authHeaders })
    const tokenUser = normalizeUser(result.user)
    if (!tokenUser) return null
    const currentRecord = await payload.findByID({ collection: 'users', id: tokenUser.id, depth: 0, overrideAccess: true })
    const user = normalizeUser(currentRecord)
    return user ? { payload, user } : null
  } catch {
    return null
  }
}

export async function requireStaffSession() {
  const session = await getStaffSession()
  if (!session) redirect('/equipo/login')
  return session
}
