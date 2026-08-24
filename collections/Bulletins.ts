import type { CollectionConfig } from 'payload'

import { canPublish, isPayloadAdminUser } from '../lib/access'

export const Bulletins: CollectionConfig = {
  slug: 'bulletins',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    group: 'Comunicación',
    description: 'Boletines largos con avances, registros y aprendizajes de la operación.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: isPayloadAdminUser,
    create: canPublish,
    update: canPublish,
    delete: canPublish,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'summary', type: 'textarea', label: 'Resumen', required: true },
    { name: 'body', type: 'textarea', label: 'Contenido completo', required: true },
    { name: 'category', type: 'text', label: 'Categoría', required: true },
    { name: 'author', type: 'text', label: 'Equipo responsable', required: true },
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
