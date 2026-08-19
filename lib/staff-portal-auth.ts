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
  const canManageAllEvidence = moduleSlug === 'evidencias'
  const canViewAllRequests = moduleSlug === 'administracion'
  return isPortalAdministrator(user) || canManageAllEvidence || canViewAllRequests ? undefined : { registeredByUserId: { equals: user.id } }
}

export function ownsPortalRecord(user: PortalUser, record: unknown, moduleSlug?: string) {
  if (isPortalAdministrator(user) || moduleSlug === 'evidencias' || moduleSlug === 'administracion') return true
  if (!record || typeof record !== 'object') return false
  return (record as { registeredByUserId?: unknown }).registeredByUserId === user.id
}

export function getDashboardRoleLabel(role: DashboardRole) {
  return dashboardRoleLabels[role]
}

export async function getStaffSession() {
  try {
    const payload = await getPayload({ config })
    const result = await payload.auth({ headers: await headers() })
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
