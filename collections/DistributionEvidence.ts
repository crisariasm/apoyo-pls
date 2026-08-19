import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { canManageDistribution, isPayloadAdminUser, publicStatusRead } from '../lib/access'

const validateEvidenceSource: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  const isSeedContext = req.context?.seed === true
  const sourceType = data && typeof data.sourceType === 'string' ? data.sourceType : 'distribucion'
  const distribution = data?.distribution
  const otherReference = typeof data?.otherReference === 'string' ? data.otherReference.trim() : ''
  if (sourceType === 'distribucion' && !distribution) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'distribution', message: 'Selecciona la salida de distribución o elige otro registro.' }], req })
  }
  if (sourceType === 'otro' && !otherReference) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'otherReference', message: 'Completa la referencia del otro registro operativo.' }], req })
  }
  const publicImagePath = typeof data?.publicImagePath === 'string' ? data.publicImagePath.trim() : ''
  const imageWasSubmitted = data ? Object.prototype.hasOwnProperty.call(data, 'image') : false
  if (publicImagePath && !isSeedContext) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'image', message: 'La ruta pública de imagen solo puede ser usada por el seeder.' }], req })
  }
  const hasImage = Boolean(data?.image) || (isSeedContext && publicImagePath !== '')
  if ((operation === 'create' || imageWasSubmitted) && !hasImage) {
    throw new ValidationError({ collection: 'distribution-evidence', errors: [{ path: 'image', message: 'La imagen es obligatoria.' }], req })
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
    },
    { name: 'publicImagePath', type: 'text', label: 'Ruta de imagen pública', maxLength: 255, admin: { hidden: true, readOnly: true } },
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
