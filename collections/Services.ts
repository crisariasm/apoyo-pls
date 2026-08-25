import { ValidationError, type CollectionAfterChangeHook, type CollectionAfterDeleteHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { canManageServices, isPayloadAdminUser } from '../lib/access'
import { deleteUnreferencedMedia, mediaReferencesFromDocument } from '../lib/media-cleanup'
import { isValidWhatsAppNumber, whatsappCountryCodes } from '../lib/whatsapp'

const validateServiceContact: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const values = { ...(originalDoc as Record<string, unknown> | undefined), ...(data as Record<string, unknown> | undefined) }
  const phoneNumber = typeof values.whatsappNumber === 'string' ? values.whatsappNumber.trim() : ''
  if (!phoneNumber) throw new ValidationError({ collection: 'services', errors: [{ path: 'whatsappNumber', message: 'El número de WhatsApp es obligatorio.' }], req })
  if (!isValidWhatsAppNumber(values.whatsappCountryCode, phoneNumber)) throw new ValidationError({ collection: 'services', errors: [{ path: 'whatsappNumber', message: 'Escribe un número de WhatsApp válido junto con su indicativo.' }], req })
  return data
}

const cleanupServiceMedia: CollectionAfterChangeHook = async ({ operation, previousDoc, req }) => {
  if (operation === 'update') await deleteUnreferencedMedia(req.payload, mediaReferencesFromDocument(previousDoc))
}

const cleanupDeletedServiceMedia: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await deleteUnreferencedMedia(req.payload, mediaReferencesFromDocument(doc))
}

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'category', 'location', 'status'],
    group: 'Comunidad',
    description: 'Servicios gratuitos, ofrecidos por la comunidad o que todavía se necesitan.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: isPayloadAdminUser,
    create: canManageServices,
    update: canManageServices,
    delete: canManageServices,
  },
  hooks: {
    beforeValidate: [validateServiceContact],
    afterChange: [cleanupServiceMedia],
    afterDelete: [cleanupDeletedServiceMedia],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Nombre del servicio', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen del servicio' },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo de servicio',
      required: true,
      options: [
        { label: 'Gratuito', value: 'gratuito' },
        { label: 'Ofrecido por la comunidad', value: 'ofrecido' },
        { label: 'Se necesita', value: 'necesitado' },
      ],
    },
    { name: 'category', type: 'text', label: 'Categoría', required: true },
    { name: 'provider', type: 'text', label: 'Persona, equipo u organización', required: true },
    { name: 'location', type: 'text', label: 'Zona o modalidad', required: true },
    { name: 'price', type: 'text', label: 'Costo o condición' },
    { name: 'whatsappCountryCode', type: 'select', label: 'Indicativo de WhatsApp', required: true, defaultValue: '+57', options: whatsappCountryCodes.map((option) => ({ ...option })) },
    { name: 'whatsappNumber', type: 'text', label: 'Número de WhatsApp', required: true, maxLength: 20, admin: { description: 'Escríbelo sin el indicativo, por ejemplo: 300 123 4567.' } },
    {
      name: 'status',
      index: true,
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'publicado',
      options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ],
    },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true, index: true },
    { name: 'publishedAt', type: 'date', label: 'Fecha de publicación', index: true },
  ],
}
