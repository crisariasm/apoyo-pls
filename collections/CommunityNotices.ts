import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { canManageNotices, isPayloadAdminUser, publicStatusRead } from '../lib/access'

const validateNoticeImage: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  const isSeedContext = req.context?.seed === true
  const publicImagePath = typeof data?.publicImagePath === 'string' ? data.publicImagePath.trim() : ''
  const imageWasSubmitted = data ? Object.prototype.hasOwnProperty.call(data, 'image') : false
  if (publicImagePath && !isSeedContext) {
    throw new ValidationError({ collection: 'community-notices', errors: [{ path: 'image', message: 'La ruta pública de imagen solo puede ser usada por el seeder.' }], req })
  }
  const hasImage = Boolean(data?.image) || (isSeedContext && publicImagePath !== '')
  if ((operation === 'create' || imageWasSubmitted) && !hasImage) {
    throw new ValidationError({ collection: 'community-notices', errors: [{ path: 'image', message: 'La imagen es obligatoria.' }], req })
  }
  return data
}

export const CommunityNotices: CollectionConfig = {
  slug: 'community-notices',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'location', 'status', 'publishedAt'],
    group: 'Comunidad',
    description: 'Comunicados comunitarios moderados: mascotas, vivienda, objetos e información de interés general.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicStatusRead,
    create: canManageNotices,
    update: canManageNotices,
    delete: canManageNotices,
  },
  hooks: { beforeValidate: [validateNoticeImage] },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'body', type: 'textarea', label: 'Descripción', required: true },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      required: true,
      options: [
        { label: 'Mascota perdida', value: 'mascota-perdida' },
        { label: 'Mascota encontrada', value: 'mascota-encontrada' },
        { label: 'Apoyo comunitario', value: 'apoyo-comunitario' },
        { label: 'Objeto perdido', value: 'objeto-perdido' },
        { label: 'Información comunitaria', value: 'informacion-comunitaria' },
        { label: 'Vivienda', value: 'vivienda' },
        { label: 'Otro', value: 'otro' },
      ],
    },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Imagen' },
    { name: 'publicImagePath', type: 'text', label: 'Ruta de imagen pública', maxLength: 255, admin: { hidden: true, readOnly: true } },
    { name: 'location', type: 'text', label: 'Zona general', required: true },
    { name: 'contact', type: 'text', label: 'Canal o responsable', required: true },
    {
      name: 'status',
      index: true,
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'borrador',
      options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ],
    },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, index: true },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true, index: true },
    { name: 'publishedAt', type: 'date', label: 'Fecha de publicación', index: true },
  ],
}
