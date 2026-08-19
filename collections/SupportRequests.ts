import { ValidationError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { isCoordinator, isPayloadAdminUser } from '../lib/access'
import { isValidPhone, isValidQuantity, isValidQuantityUnit, quantityValue, supportQuantityUnits } from '../lib/public-request-validation'

const preventPendingRegression: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation === 'update' && originalDoc?.status !== 'pendiente' && data?.status === 'pendiente') {
    throw new ValidationError({
      collection: 'support-requests',
      errors: [{ path: 'status', message: 'Una solicitud gestionada no puede volver a estado pendiente.' }],
      req,
    })
  }
  return data
}

const validateSupportRequestFields: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  const values = (data || {}) as Record<string, unknown>
  const errors: Array<{ path: string; message: string }> = []
  const phone = values.phone
  const shouldValidatePhone = operation === 'create' || phone !== undefined
  if (shouldValidatePhone && !isValidPhone(phone)) errors.push({ path: 'phone', message: 'Escribe un número de teléfono válido.' })

  const hasQuantity = values.quantity !== undefined && values.quantity !== null && values.quantity !== ''
  const hasUnit = values.quantityUnit !== undefined && values.quantityUnit !== null && values.quantityUnit !== ''
  if (hasQuantity && !isValidQuantity(values.quantity)) errors.push({ path: 'quantity', message: 'La cantidad debe ser un número entero entre 1 y 1.000.000.000.' })
  if (hasUnit && !isValidQuantityUnit(values.quantityUnit)) errors.push({ path: 'quantityUnit', message: 'Selecciona una unidad válida.' })
  if (hasQuantity !== hasUnit) errors.push({ path: hasQuantity ? 'quantityUnit' : 'quantity', message: hasQuantity ? 'Selecciona la unidad de la cantidad.' : 'Indica la cantidad antes de seleccionar una unidad.' })

  if (errors.length) throw new ValidationError({ collection: 'support-requests', errors, req })
  if (hasQuantity) return { ...data, quantity: quantityValue(values.quantity) }
  return data
}

export const SupportRequests: CollectionConfig = {
  slug: 'support-requests',
  admin: {
    useAsTitle: 'requestType',
    defaultColumns: ['helpType', 'requestType', 'zone', 'status', 'createdAt'],
    group: 'Atención interna',
    description: 'Solicitudes recibidas desde la página pública. No se publican nombres ni datos individuales.',
  },
  access: {
    admin: isPayloadAdminUser,
    // Las solicitudes públicas solo se crean mediante /api/public/support-request,
    // que valida el body, el aviso de privacidad y el límite por IP antes de usar
    // overrideAccess de forma explícita.
    create: isCoordinator,
    read: isCoordinator,
    update: isCoordinator,
    delete: isCoordinator,
  },
  hooks: { beforeValidate: [validateSupportRequestFields], beforeChange: [preventPendingRegression] },
  fields: [
    { name: 'helpType', type: 'select', label: 'Tipo de ayuda', required: true, defaultValue: 'necesitar-ayuda', options: [
      { label: 'Necesitar ayuda', value: 'necesitar-ayuda' },
      { label: 'Ofrecer ayuda', value: 'ofrecer-ayuda' },
    ] },
    { name: 'requestType', type: 'select', label: 'Tipo de solicitud', required: true, options: [
      { label: 'Solicitar recursos', value: 'recursos' },
      { label: 'Ofrecer recursos', value: 'oferta' },
      { label: 'Solicitar transporte', value: 'transporte' },
      { label: 'Ofrecer voluntariado', value: 'voluntariado' },
    ] },
    { name: 'category', type: 'text', label: 'Categoría', required: true, maxLength: 120 },
    { name: 'zone', type: 'text', label: 'Zona o barrio', required: true, maxLength: 160 },
    { name: 'quantity', type: 'number', label: 'Cantidad aproximada', min: 1, max: 1000000000, admin: { description: 'Opcional. Usa solo números enteros positivos.' } },
    { name: 'quantityUnit', type: 'select', label: 'Unidad de la cantidad', options: supportQuantityUnits.map(({ label, value }) => ({ label, value })), admin: { description: 'Se necesita cuando indicas una cantidad.' } },
    { name: 'description', type: 'textarea', label: 'Detalle', required: true, maxLength: 5000 },
    { name: 'contactName', type: 'text', label: 'Nombre de contacto', required: true, maxLength: 160 },
    { name: 'phone', type: 'text', label: 'Teléfono', required: true, maxLength: 20, admin: { description: 'Número para coordinar la ayuda. No se publica.' } },
    { name: 'status', type: 'select', label: 'Estado', required: true, defaultValue: 'pendiente', options: [
      { label: 'Pendiente', value: 'pendiente' },
      { label: 'En revisión', value: 'en-revision' },
      { label: 'Asignada', value: 'asignada' },
      { label: 'Atendida', value: 'atendida' },
      { label: 'Cerrada', value: 'cerrada' },
    ] },
    { name: 'internalNotes', type: 'textarea', label: 'Notas internas', access: { read: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user) } },
    { name: 'privacyAccepted', type: 'checkbox', label: 'Aceptó el aviso de privacidad', required: true },
  ],
}
