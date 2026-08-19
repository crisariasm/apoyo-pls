import { ValidationError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { isCoordinator, isPayloadAdminUser } from '../lib/access'

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
  hooks: { beforeChange: [preventPendingRegression] },
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
    { name: 'category', type: 'text', label: 'Categoría', required: true },
    { name: 'zone', type: 'text', label: 'Zona o barrio', required: true },
    { name: 'quantity', type: 'text', label: 'Cantidad aproximada' },
    { name: 'description', type: 'textarea', label: 'Detalle', required: true },
    { name: 'contactName', type: 'text', label: 'Nombre de contacto', required: true },
    { name: 'contactChannel', type: 'text', label: 'Canal de contacto', required: true },
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
