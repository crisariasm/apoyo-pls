import type { CollectionConfig } from 'payload'

import { canManageServices, isPayloadAdminUser, publicStatusRead } from '../lib/access'

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
    read: publicStatusRead,
    create: canManageServices,
    update: canManageServices,
    delete: canManageServices,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Nombre del servicio', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true },
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
