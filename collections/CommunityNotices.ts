import type { CollectionConfig } from 'payload'

import { canManageNotices, isPayloadAdminUser, publicStatusRead } from '../lib/access'

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
    { name: 'location', type: 'text', label: 'Zona general', required: true },
    { name: 'contact', type: 'text', label: 'Canal o responsable', required: true },
    {
      name: 'status',
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
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true },
    { name: 'publishedAt', type: 'date', label: 'Fecha de publicación' },
  ],
}
