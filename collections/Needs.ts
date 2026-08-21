import type { CollectionConfig } from 'payload'

import { canManageNeeds, isPayloadAdminUser, publicVisibleRead } from '../lib/access'
import { resourceCategories } from '../lib/resource-categories'

export const Needs: CollectionConfig = {
  slug: 'needs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'priority', 'status', 'zone', 'updatedAt'],
    group: 'Operación',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicVisibleRead,
    create: canManageNeeds,
    update: canManageNeeds,
    delete: canManageNeeds,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Necesidad', required: true },
    { name: 'detail', type: 'textarea', label: 'Detalle público', required: true },
    { name: 'category', type: 'select', label: 'Categoría', required: true, options: resourceCategories.map(({ label, value }) => ({ label, value })) },
    { name: 'quantity', type: 'number', label: 'Cantidad aproximada', min: 1 },
    { name: 'unit', type: 'text', label: 'Presentación / medida', admin: { placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad solicitada.' } },
    {
      name: 'priority',
      type: 'select',
      label: 'Prioridad',
      required: true,
      defaultValue: 'media',
      options: [
        { label: 'Crítica', value: 'critica' },
        { label: 'Alta', value: 'alta' },
        { label: 'Media', value: 'media' },
      ],
    },
    {
      name: 'status',
      index: true,
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'abierta',
      options: [
        { label: 'Abierta', value: 'abierta' },
        { label: 'En gestión', value: 'en-gestion' },
        { label: 'Cubierta', value: 'cubierta' },
        { label: 'Cerrada', value: 'cerrada' },
      ],
    },
    { name: 'zone', type: 'text', label: 'Zona o destino general' },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true, index: true },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, index: true, admin: { description: 'Lo fija como una de las necesidades prioritarias en la vista pública.' } },
    { name: 'publishedAt', type: 'date', label: 'Publicar desde' },
  ],
}
