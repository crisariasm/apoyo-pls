import type { PortalModule, PortalField } from './staff-portal-config'
import { isUUID } from './uuid'

type FormData = Record<string, unknown>

const defaultMaxLengths: Partial<Record<PortalField['type'], number>> = {
  text: 160,
  textarea: 5000,
  select: 80,
  date: 40,
}

export function getPortalFieldMaxLength(field: PortalField) {
  return field.maxLength ?? defaultMaxLengths[field.type]
}

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function isUploadValue(value: unknown) {
  if (typeof value === 'string') return isUUID(value)
  if (typeof File !== 'undefined' && value instanceof File) return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function') return true
  const id = (value as { id?: unknown }).id
  return typeof id === 'string' && isUUID(id)
}

function normalizeFieldValue(field: PortalField, value: unknown) {
  if (field.type === 'number' && value !== '' && value !== undefined && value !== null) return Number(value)
  if (field.type === 'text' || field.type === 'textarea') return typeof value === 'string' ? value.trim() : value
  return value
}

export function normalizePortalData(module: PortalModule, data: FormData) {
  const normalized = Object.fromEntries(module.fields.map((field) => [field.name, normalizeFieldValue(field, data[field.name])]).filter(([, value]) => value !== '')) as FormData

  // Una publicación sin fecha queda fuera de las vistas públicas. Si el equipo
  // elige “Publicado” y no diligencia la fecha, usamos el momento del guardado
  // para que el registro no quede invisible por un dato auxiliar.
  if (['anuncios', 'boletin', 'servicios', 'comunicados'].includes(module.slug) && normalized.status === 'publicado' && isBlank(normalized.publishedAt)) {
    normalized.publishedAt = new Date().toISOString()
  }

  return normalized
}

export function validatePortalData(module: PortalModule, data: FormData, options?: { partial?: boolean }) {
  const partial = options?.partial === true
  const errors: string[] = []

  for (const field of module.fields) {
    const value = data[field.name]
    if (!partial && field.required && isBlank(value)) errors.push(`Completa: ${field.label}.`)
    if (typeof value === 'string') {
      const maxLength = getPortalFieldMaxLength(field)
      if (maxLength !== undefined && value.length > maxLength) errors.push(`${field.label} no puede superar ${maxLength} caracteres.`)
    }
    if (field.type === 'number' && !isBlank(value)) {
      const numberValue = Number(value)
      if (!Number.isFinite(numberValue)) errors.push(`${field.label} debe ser un número válido.`)
      else if (!Number.isSafeInteger(numberValue)) errors.push(`${field.label} debe ser un número entero válido.`)
      else if (Math.abs(numberValue) > 1_000_000_000) errors.push(`${field.label} supera el límite permitido.`)
      else if (field.min !== undefined && numberValue < field.min) errors.push(`${field.label} debe ser igual o mayor que ${field.min}.`)
    }
    if (field.type === 'date' && !isBlank(value) && Number.isNaN(new Date(String(value)).getTime())) errors.push(`${field.label} debe tener una fecha válida.`)
    // Antes de guardar, el navegador todavía conserva el File seleccionado o
    // el objeto de media existente. El servidor recibirá el UUID después de
    // que el panel complete la carga; ambos estados son válidos aquí.
    if (field.type === 'upload' && !isBlank(value) && !isUploadValue(value)) errors.push(`${field.label} no es válida.`)
    const isDynamicEvidenceDistribution = module.slug === 'evidencias' && field.name === 'distribution' && typeof value === 'string' && isUUID(value)
    if (field.type === 'select' && !isBlank(value) && !isDynamicEvidenceDistribution && !field.options?.some((option) => option.value === value)) errors.push(`${field.label} contiene una opción no válida.`)
    if (field.type === 'checkbox' && !isBlank(value) && typeof value !== 'boolean') errors.push(`${field.label} debe ser verdadero o falso.`)
  }

  const quantity = data.quantity
  const unit = data.unit
  if (module.slug === 'necesitamos' && !isBlank(quantity) !== !isBlank(unit)) errors.push('Cuando indiques una cantidad, completa también la presentación / medida.')

  if (module.slug === 'evidencias') {
    if (data.sourceType === 'distribucion' && isBlank(data.distribution)) errors.push('Selecciona la salida de distribución o elige Otro registro operativo.')
    if (data.sourceType === 'otro' && isBlank(data.otherReference)) errors.push('Completa la referencia del otro registro operativo.')
  }

  const publishedModules = ['anuncios', 'boletin', 'servicios', 'comunicados']
  if (publishedModules.includes(module.slug) && data.status === 'publicado' && isBlank(data.publishedAt)) errors.push('Completa: Fecha de publicación para publicar este registro.')

  return errors[0] || null
}
