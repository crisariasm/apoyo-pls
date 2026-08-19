import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { canManageDistribution, isPayloadAdminUser, publicStatusRead } from '../lib/access'

const validateEvidenceSource: CollectionBeforeValidateHook = ({ data, req }) => {
  const sourceType = data && typeof data.sourceType === 'string' ? data.sourceType : 'distribucion'
  const distribution = data?.distribution
  const otherReference = typeof data?.otherReference === 'string' ? data.otherReference.trim() : ''
  if (sourceType === 'distribucion' && !distribution) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'distribution', message: 'Selecciona la salida de distribución o elige otro registro.' }], req })
  }
  if (sourceType === 'otro' && !otherReference) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'otherReference', message: 'Completa la referencia del otro registro operativo.' }], req })
  }
  return data
}

export const DistributionEvidence: CollectionConfig = {
  slug: 'distribution-evidence',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sourceType', 'distribution', 'status', 'publishedAt'],
    group: 'Operación',
    description: 'Registro visual separado para documentar salidas de distribución sin datos sensibles.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicStatusRead,
    create: canManageDistribution,
    update: canManageDistribution,
    delete: canManageDistribution,
  },
  hooks: { beforeValidate: [validateEvidenceSource] },
  fields: [
    {
      name: 'sourceType',
      type: 'select',
      label: 'Origen de la evidencia',
      required: true,
      defaultValue: 'distribucion',
      options: [
        { label: 'Salida de distribución', value: 'distribucion' },
        { label: 'Otro registro operativo', value: 'otro' },
      ],
    },
    {
      name: 'distribution',
      type: 'relationship',
      relationTo: 'distributions',
      label: 'Salida de distribución',
    },
    { name: 'otherReference', type: 'text', label: 'Referencia del otro registro', maxLength: 160 },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagen',
      required: true,
    },
    { name: 'title', type: 'text', label: 'Título breve', required: true, maxLength: 160 },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true, maxLength: 2000 },
    {
      name: 'status',
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
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true },
    { name: 'publishedAt', type: 'date', label: 'Fecha de publicación', defaultValue: () => new Date().toISOString() },
  ],
}
