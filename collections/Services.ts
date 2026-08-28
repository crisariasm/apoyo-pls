import { ValidationError, type CollectionAfterChangeHook, type CollectionAfterDeleteHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { canManageServices, isPayloadAdminUser } from '../lib/access'
import { deleteUnreferencedMedia, mediaReferencesFromDocument } from '../lib/media-cleanup'
import { normalizeServiceCoverage, serviceCoverageFromCity, serviceModes, servicePricingTypes } from '../lib/service-options'
import { isValidWhatsAppNumber, whatsappCountryCodes } from '../lib/whatsapp'

const validateServiceContact: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const values = { ...(originalDoc as Record<string, unknown> | undefined), ...(data as Record<string, unknown> | undefined) }
  const phoneNumber = typeof values.whatsappNumber === 'string' ? values.whatsappNumber.trim() : ''
  if (!phoneNumber) throw new ValidationError({ collection: 'services', errors: [{ path: 'whatsappNumber', message: 'El número de WhatsApp es obligatorio.' }], req })
  if (!isValidWhatsAppNumber(values.whatsappCountryCode, phoneNumber)) throw new ValidationError({ collection: 'services', errors: [{ path: 'whatsappNumber', message: 'Escribe un número de WhatsApp válido junto con su indicativo.' }], req })
  return data
}

const validateServiceCoverage: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const values = { ...(originalDoc as Record<string, unknown> | undefined), ...(data as Record<string, unknown> | undefined) }
  const coverage = normalizeServiceCoverage(values.coverage)
  if (coverage.length === 0 && typeof values.city === 'string' && values.city.trim()) {
    return { ...(data || {}), coverage: serviceCoverageFromCity(values.city) }
  }
  if (values.coverage !== undefined && values.coverage !== null && coverage.length === 0) {
    throw new ValidationError({ collection: 'services', errors: [{ path: 'coverage', message: 'La cobertura seleccionada no es válida.' }], req })
  }
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
    defaultColumns: ['title', 'type', 'category', 'city', 'pricingType', 'status'],
    group: 'Comunidad',
    description: 'Servicios gratuitos y oportunidades de trabajo ofrecidas por la comunidad.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: isPayloadAdminUser,
    create: canManageServices,
    update: canManageServices,
    delete: canManageServices,
  },
  hooks: {
    beforeValidate: [validateServiceContact, validateServiceCoverage],
    afterChange: [cleanupServiceMedia],
    afterDelete: [cleanupDeletedServiceMedia],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Nombre del servicio', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true },
    { name: 'vision', type: 'text', label: 'Visión PL', maxLength: 160, admin: { description: 'Escribe una frase corta que resuma el propósito del servicio.' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen del servicio' },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo de servicio',
      required: true,
      options: [
        { label: 'Gratuito', value: 'gratuito' },
        { label: 'Ofrecido por la comunidad', value: 'ofrecido' },
        { label: 'Solicitud de apoyo', value: 'necesitado' },
      ],
    },
    { name: 'category', type: 'text', label: 'Categoría', required: true, admin: { description: 'Usa una categoría corta y clara, por ejemplo: Transporte, Mascotas, Salud o Reparaciones.' } },
    { name: 'provider', type: 'text', label: 'Persona, equipo u organización', required: true },
    { name: 'city', type: 'text', label: 'Ciudad principal', required: true, defaultValue: 'Pereira', maxLength: 100, admin: { description: 'Se conserva como ciudad principal para compatibilidad. La cobertura completa se selecciona abajo.' }, index: true },
    { name: 'coverage', type: 'json', label: 'Coberturas por departamento y municipio', required: true, admin: { description: 'Selecciona uno o varios municipios. El formulario conserva la ciudad principal en el campo anterior.' } },
    { name: 'serviceMode', type: 'select', label: 'Modalidad', required: true, defaultValue: 'presencial', options: serviceModes.map((option) => ({ ...option })) },
    { name: 'location', type: 'text', label: 'Barrio, zona o cobertura', required: true, admin: { description: 'Especifica el sector, punto de encuentro o alcance del servicio.' } },
    { name: 'availability', type: 'text', label: 'Disponibilidad', admin: { description: 'Ejemplo: lunes a viernes en la tarde, con cita previa o cupos limitados.' } },
    { name: 'pricingType', type: 'select', label: 'Tipo de tarifa', required: true, defaultValue: 'gratis', options: servicePricingTypes.map((option) => ({ ...option })) },
    { name: 'price', type: 'text', label: 'Costo o condición', admin: { description: 'Haz visible el valor, rango o condición del servicio cuando sea de pago.' } },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, index: true, admin: { description: 'Lo muestra primero en el directorio.' } },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true, index: true },
    { name: 'providerEmail', type: 'email', label: 'Correo de contacto', admin: { description: 'Dato privado para que el equipo pueda contactar a quien ofrece el servicio. No se publica.' } },
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
    { name: 'publishedAt', type: 'date', label: 'Fecha de publicación', index: true },
    { name: 'submissionSource', type: 'select', label: 'Origen de la solicitud', defaultValue: 'staff', options: [{ label: 'Registro interno', value: 'staff' }, { label: 'Formulario público', value: 'public-offer' }], admin: { readOnly: true, hidden: true } },
    { name: 'approvedBy', type: 'text', label: 'Aprobado por', maxLength: 160, admin: { readOnly: true, description: 'Se completa al aprobar una solicitud pública.' } },
    { name: 'approvedByUserId', type: 'text', label: 'ID de quien aprobó', maxLength: 64, admin: { readOnly: true, hidden: true } },
    { name: 'approvedAt', type: 'date', label: 'Fecha de aprobación', admin: { readOnly: true } },
  ],
}
