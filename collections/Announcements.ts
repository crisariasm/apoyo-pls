import type { CollectionConfig } from 'payload'

import { canPublish, isPayloadAdminUser, publicStatusRead } from '../lib/access'

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'status', 'publishedAt', 'updatedAt'],
    group: 'Comunicación',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicStatusRead,
    create: canPublish,
    update: canPublish,
    delete: canPublish,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'body', type: 'textarea', label: 'Contenido', required: true },
    {
      name: 'type',
      type: 'select',
      label: 'Tipo',
      required: true,
      options: [
        { label: 'Horario', value: 'horario' },
        { label: 'Necesidad', value: 'necesidad' },
        { label: 'Distribución', value: 'distribucion' },
        { label: 'Voluntariado', value: 'voluntariado' },
        { label: 'Información oficial', value: 'oficial' },
        { label: 'Impacto', value: 'impacto' },
      ],
    },
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
    { name: 'expiresAt', type: 'date', label: 'Válido hasta' },
  ],
}
