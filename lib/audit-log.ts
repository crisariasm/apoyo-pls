import type {
  AfterErrorHook,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterLoginHook,
  CollectionAfterLogoutHook,
  GlobalAfterChangeHook,
  PayloadRequest,
  RequestContext,
} from 'payload'

export const auditActionValues = ['login', 'logout', 'create', 'update', 'delete', 'error'] as const
export const auditSourceValues = ['payload-admin', 'equipo', 'sistema'] as const

export type AuditAction = (typeof auditActionValues)[number]
export type AuditSource = (typeof auditSourceValues)[number]
export type AuditEntityType = 'collection' | 'global' | 'auth' | 'system'

type AuditActor = {
  email: string
  id: string
  name: string
  role: string
}

type AuditEntryInput = {
  action: AuditAction
  actor?: AuditActor | null
  changedFields?: string[]
  documentId?: unknown
  documentLabel?: unknown
  entitySlug: string
  entityType: AuditEntityType
  errorName?: string
  source?: AuditSource
  statusCode?: number
  success?: boolean
  summary: string
}

const excludedChangeFields = new Set([
  'createdAt',
  'updatedAt',
  'registeredBy',
  'registeredByUserId',
  'updatedBy',
  'updatedByUserId',
  'hash',
  'salt',
  'sessions',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'apiKey',
  'token',
])

const entityLabels: Record<string, string> = {
  'aid-intakes': 'ayudas recibidas',
  announcements: 'anuncios del centro',
  bulletins: 'boletines',
  'community-notices': 'comunicados',
  distributions: 'distribución',
  'distribution-evidence': 'evidencias',
  media: 'archivos',
  needs: 'necesidades',
  resources: 'recursos',
  services: 'servicios',
  'site-settings': 'configuración del centro',
  'support-requests': 'solicitudes',
  users: 'usuarios',
  'volunteer-activities': 'actividades',
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : value === undefined || value === null ? '' : String(value).slice(0, maxLength)
}

function getActor(value: unknown): AuditActor | null {
  if (!value || typeof value !== 'object') return null
  const user = value as Record<string, unknown>
  const id = text(user.id, 64)
  const email = text(user.email, 254)
  const name = text(user.name, 160) || email || 'Usuario autenticado'
  if (!id && !email) return null
  return { id, email, name, role: text(user.role, 80) }
}

function requestPath(req: PayloadRequest) {
  if (typeof req.pathname === 'string' && req.pathname) return req.pathname.slice(0, 500)
  if (typeof req.url !== 'string' || !req.url) return ''
  try {
    return new URL(req.url, 'http://local').pathname.slice(0, 500)
  } catch {
    return ''
  }
}

function requestSource(req: PayloadRequest, actor: AuditActor): AuditSource {
  const path = requestPath(req)
  if (path.startsWith('/api/equipo') || (actor.role && actor.role !== 'admin' && actor.role !== 'super-admin')) return 'equipo'
  if (actor.role === 'admin' || actor.role === 'super-admin') return 'payload-admin'
  return 'sistema'
}

function requestAddress(req: PayloadRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = req.headers.get('x-real-ip')?.trim()
  return text(forwarded || real || 'unknown', 128)
}

function shouldSkipAudit(context: RequestContext | undefined, entitySlug?: string) {
  return Boolean(context?.skipAuditLog || context?.seed || entitySlug === 'audit-logs')
}

function valuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

function changedFieldNames(data: unknown, previousDoc: unknown, doc: unknown, operation: 'create' | 'update') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  const previous = previousDoc && typeof previousDoc === 'object' ? previousDoc as Record<string, unknown> : {}
  const current = doc && typeof doc === 'object' ? doc as Record<string, unknown> : {}
  const keys = Object.keys(data as Record<string, unknown>)
    .filter((key) => !excludedChangeFields.has(key))
    .filter((key) => operation === 'create' || !valuesEqual(previous[key], current[key]))
    .map((key) => key === 'password' ? 'credenciales' : key)
  return [...new Set(keys)].slice(0, 50)
}

function documentLabel(doc: unknown) {
  if (!doc || typeof doc !== 'object') return ''
  const record = doc as Record<string, unknown>
  const candidates = ['title', 'name', 'resourceName', 'requestType', 'email', 'filename', 'centerName', 'otherReference']
  for (const field of candidates) {
    const value = text(record[field], 200)
    if (value) return value
  }
  return text(record.id, 80)
}

function entityLabel(slug: string) {
  return entityLabels[slug] || slug
}

function operationMethod(action: AuditAction) {
  if (action === 'create' || action === 'login') return 'POST'
  if (action === 'update') return 'PATCH'
  if (action === 'delete' || action === 'logout') return 'DELETE'
  return ''
}

export async function writeAuditEntry(req: PayloadRequest, input: AuditEntryInput) {
  if (shouldSkipAudit(req.context, input.entitySlug)) return
  const actor = input.actor || getActor(req.user)
  if (!actor) return

  try {
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        occurredAt: new Date().toISOString(),
        action: input.action,
        source: input.source || requestSource(req, actor),
        actorName: actor.name,
        actorEmail: actor.email || undefined,
        actorRole: actor.role || undefined,
        actorId: actor.id || undefined,
        entityType: input.entityType,
        entitySlug: text(input.entitySlug, 120),
        documentId: text(input.documentId, 80) || undefined,
        documentLabel: text(input.documentLabel, 200) || undefined,
        changedFields: input.changedFields?.length ? input.changedFields.join(', ').slice(0, 2000) : undefined,
        summary: text(input.summary, 1000),
        path: requestPath(req) || undefined,
        method: text(req.method, 16) || operationMethod(input.action),
        ipAddress: requestAddress(req),
        userAgent: text(req.headers.get('user-agent'), 500) || undefined,
        success: input.success !== false,
        statusCode: input.statusCode,
        errorName: text(input.errorName, 120) || undefined,
      },
      context: { skipAuditLog: true },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'No fue posible guardar el registro de auditoría.' })
  }
}

export const auditCollectionChange: CollectionAfterChangeHook = async ({ collection, context, data, doc, operation, previousDoc, req }) => {
  if (shouldSkipAudit(context, collection.slug)) return
  const actor = getActor(req.user)
  if (!actor) return
  const label = documentLabel(doc)
  const actionText = operation === 'create' ? 'creó' : 'actualizó'
  await writeAuditEntry(req, {
    action: operation,
    actor,
    changedFields: changedFieldNames(data, previousDoc, doc, operation),
    documentId: (doc as { id?: unknown })?.id,
    documentLabel: label,
    entitySlug: collection.slug,
    entityType: 'collection',
    summary: `${actor.name} ${actionText} un registro en ${entityLabel(collection.slug)}${label ? `: ${label}` : ''}.`,
  })
}

export const auditCollectionDelete: CollectionAfterDeleteHook = async ({ collection, context, doc, id, req }) => {
  if (shouldSkipAudit(context, collection.slug)) return
  const actor = getActor(req.user)
  if (!actor) return
  const label = documentLabel(doc)
  await writeAuditEntry(req, {
    action: 'delete',
    actor,
    documentId: id,
    documentLabel: label,
    entitySlug: collection.slug,
    entityType: 'collection',
    summary: `${actor.name} eliminó un registro de ${entityLabel(collection.slug)}${label ? `: ${label}` : ''}.`,
  })
}

export const auditGlobalChange: GlobalAfterChangeHook = async ({ context, data, doc, global, previousDoc, req }) => {
  if (shouldSkipAudit(context, global.slug)) return
  const actor = getActor(req.user)
  if (!actor) return
  const fields = changedFieldNames(data, previousDoc, doc, 'update')
  if (!fields.length) return
  await writeAuditEntry(req, {
    action: 'update',
    actor,
    changedFields: fields,
    documentLabel: documentLabel(doc),
    entitySlug: global.slug,
    entityType: 'global',
    summary: `${actor.name} actualizó ${entityLabel(global.slug)}.`,
  })
}

export const auditLogin: CollectionAfterLoginHook = async ({ context, req, user }) => {
  if (shouldSkipAudit(context, 'authentication')) return
  const actor = getActor(user)
  if (!actor) return
  const source = requestSource(req, actor)
  await writeAuditEntry(req, {
    action: 'login',
    actor,
    documentId: actor.id,
    documentLabel: actor.name,
    entitySlug: 'authentication',
    entityType: 'auth',
    source,
    summary: `${actor.name} inició sesión en ${source === 'payload-admin' ? 'el administrador de Payload' : 'el panel de equipo'}.`,
  })
}

export const auditLogout: CollectionAfterLogoutHook = async ({ context, req }) => {
  if (shouldSkipAudit(context, 'authentication')) return
  const actor = getActor(req.user)
  if (!actor) return
  const source = requestSource(req, actor)
  await writeAuditEntry(req, {
    action: 'logout',
    actor,
    documentId: actor.id,
    documentLabel: actor.name,
    entitySlug: 'authentication',
    entityType: 'auth',
    source,
    summary: `${actor.name} cerró sesión en ${source === 'payload-admin' ? 'el administrador de Payload' : 'el panel de equipo'}.`,
  })
}

export const auditPayloadError: AfterErrorHook = async ({ collection, context, error, req }) => {
  if (shouldSkipAudit(context, collection?.slug)) return
  const actor = getActor(req.user)
  if (!actor) return
  const status = (error as { status?: unknown }).status
  const statusCode = typeof status === 'number' && status >= 100 && status <= 599 ? status : 500
  const slug = collection?.slug || 'payload'
  await writeAuditEntry(req, {
    action: 'error',
    actor,
    entitySlug: slug,
    entityType: collection ? 'collection' : 'system',
    errorName: error.name,
    statusCode,
    success: false,
    summary: `${actor.name} encontró un error al operar en ${entityLabel(slug)}.`,
  })
}
