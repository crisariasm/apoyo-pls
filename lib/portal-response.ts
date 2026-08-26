import type { PortalModule } from './staff-portal-config'

const sensitiveKeys = new Set([
  'password',
  'hash',
  'salt',
  'token',
  'apikey',
  'sessions',
  'resetpasswordtoken',
  'resetpasswordexpiration',
  'secret',
  'secretaccesskey',
  'accesskeyid',
  'r2key',
  'r2filename',
  'r2mimetype',
  'r2filesize',
  'uploadedbyuserid',
  'uploadedbyname',
])

const nestedSensitiveKeys = new Set([
  ...sensitiveKeys,
  'registeredby',
  'registeredbyuserid',
  'updatedby',
  'updatedbyuserid',
])

function normalizedKey(key: string) {
  return key.toLowerCase().replaceAll('_', '').replaceAll('-', '')
}

function isSensitiveKey(key: string) {
  const normalized = normalizedKey(key)
  return sensitiveKeys.has(normalized)
    || normalized.includes('password')
    || normalized.includes('secret')
    || normalized.includes('token')
    || normalized.includes('apikey')
}

function sanitizeNested(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value
  if (depth > 6) return undefined
  if (Array.isArray(value)) return value.map((item) => sanitizeNested(item, depth + 1)).filter((item) => item !== undefined)

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (nestedSensitiveKeys.has(normalizedKey(key)) || isSensitiveKey(key)) continue
    const sanitized = sanitizeNested(item, depth + 1)
    if (sanitized !== undefined) result[key] = sanitized
  }
  return result
}

/**
 * El portal necesita algunos datos operativos privados, como el teléfono de
 * una solicitud, pero nunca necesita secretos de autenticación ni claves del
 * almacenamiento. Se usa una lista de campos del módulo para que un campo
 * nuevo no termine expuesto accidentalmente por devolver el documento entero.
 */
export function sanitizePortalRecord(module: PortalModule, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const allowedKeys = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'registeredBy',
    'updatedBy',
    ...module.fields.map((field) => field.name),
  ])
  if (module.slug === 'administracion') {
    for (const field of ['source', 'helpType', 'requestType', 'category', 'zone', 'quantity', 'quantityUnit', 'description', 'contactName', 'phone', 'privacyAccepted']) {
      allowedKeys.add(field)
    }
  }
  const record = value as Record<string, unknown>
  const sanitized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(record)) {
    if (!allowedKeys.has(key) || isSensitiveKey(key)) continue
    const cleanValue = sanitizeNested(item)
    if (cleanValue !== undefined) sanitized[key] = cleanValue
  }
  return sanitized
}

export function sanitizePortalRecords(module: PortalModule, values: unknown[]) {
  return values.map((value) => sanitizePortalRecord(module, value))
}
