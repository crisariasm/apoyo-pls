import { ValidationError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { isPayloadAdminUser } from './access'

const seedActor = 'Carga inicial del sistema'
const maxLengths: Record<string, number> = {
  title: 160,
  name: 160,
  resourceName: 160,
  email: 254,
  phone: 40,
  category: 120,
  unit: 80,
  sourceReference: 200,
  zone: 160,
  organization: 200,
  provider: 200,
  location: 160,
  contact: 200,
  contactName: 160,
  author: 160,
  startTime: 20,
  endTime: 20,
  body: 10000,
  detail: 5000,
  description: 5000,
  summary: 1500,
  notes: 5000,
  internalNotes: 5000,
  donationInstructions: 5000,
  heroMessage: 3000,
  centerName: 160,
  address: 240,
  hours: 160,
  registeredBy: 160,
  updatedBy: 160,
  registeredByUserId: 64,
  updatedByUserId: 64,
}

function collectLongStrings(value: unknown, path: string, errors: Array<{ path: string; message: string }>) {
  if (errors.length >= 20 || value === null || value === undefined) return
  if (typeof value === 'string') {
    const key = path.split('.').pop() || ''
    const maxLength = maxLengths[key] || 10000
    if (value.length > maxLength) errors.push({ path, message: `No puede superar ${maxLength} caracteres.` })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLongStrings(item, `${path}.${index}`, errors))
    return
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => collectLongStrings(item, path ? `${path}.${key}` : key, errors))
  }
}

const enforceStringLimits: CollectionBeforeValidateHook = ({ data, collection, req }) => {
  const errors: Array<{ path: string; message: string }> = []
  collectLongStrings(data, '', errors)
  if (errors.length) {
    throw new ValidationError({
      collection: collection.slug,
      errors: errors.map((error) => ({ path: error.path.replace(/^\./, ''), message: error.message })),
      req,
    })
  }
  return data
}

const stampAuditFields: CollectionBeforeChangeHook = ({ data, req, operation, collection }) => {
  if (!data) return data

  const user = req.user as { id?: string; name?: string; email?: string } | undefined
  const suppliedCreateActor = operation === 'create' && typeof data.registeredBy === 'string' && data.registeredBy.trim() ? data.registeredBy.trim() : ''
  const actor = user?.name?.trim() || user?.email?.trim() || suppliedCreateActor || (collection.slug === 'support-requests' ? 'Formulario público' : seedActor)
  const actorId = typeof user?.id === 'string' ? user.id : ''
  const nextData = { ...data } as Record<string, unknown>

  if (operation === 'create') {
    nextData.registeredBy = actor
    nextData.registeredByUserId = actorId || undefined
  }
  if (actor !== seedActor || !nextData.updatedBy) nextData.updatedBy = actor
  if (actorId) nextData.updatedByUserId = actorId

  return nextData
}

export function withAuditFields(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    fields: [
      ...collection.fields,
      {
        name: 'registeredBy',
        type: 'text',
        label: 'Registrado por',
        maxLength: 160,
        access: { read: isPayloadAdminUser },
        admin: { readOnly: true, description: 'Se completa automáticamente con la persona que creó el registro.' },
      },
      {
        name: 'registeredByUserId',
        type: 'text',
        label: 'ID del creador',
        maxLength: 64,
        access: { read: isPayloadAdminUser },
        admin: { readOnly: true, hidden: true },
      },
      {
        name: 'updatedBy',
        type: 'text',
        label: 'Última actualización por',
        maxLength: 160,
        access: { read: isPayloadAdminUser },
        admin: { readOnly: true, description: 'Se actualiza automáticamente con la última persona que lo modificó.' },
      },
      {
        name: 'updatedByUserId',
        type: 'text',
        label: 'ID de quien actualizó',
        maxLength: 64,
        access: { read: isPayloadAdminUser },
        admin: { readOnly: true, hidden: true },
      },
    ],
    hooks: {
      ...collection.hooks,
      beforeValidate: [...(collection.hooks?.beforeValidate || []), enforceStringLimits],
      beforeChange: [...(collection.hooks?.beforeChange || []), stampAuditFields],
    },
  }
}
