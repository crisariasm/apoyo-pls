import type { CollectionConfig } from 'payload'

import { canManageInventory, isPayloadAdminUser, publicVisibleRead } from '../lib/access'
import { resourceCategories } from '../lib/resource-categories'

export const Resources: CollectionConfig = {
  slug: 'resources',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'quantity', 'status', 'updatedAt'],
    group: 'Operación',
    description: 'Inventario visible y operativo del centro de acopio PLs al llamado.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicVisibleRead,
    create: canManageInventory,
    update: canManageInventory,
    delete: canManageInventory,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Recurso', required: true },
    { name: 'category', type: 'select', label: 'Categoría', required: true, options: resourceCategories.map(({ label, value }) => ({ label, value })) },
    { name: 'quantity', type: 'number', label: 'Cantidad aproximada', required: true, min: 0 },
    { name: 'unit', type: 'text', label: 'Presentación / medida', required: true, admin: { placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad disponible.' } },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'disponible',
      options: [
        { label: 'Disponible', value: 'disponible' },
        { label: 'Limitado', value: 'limitado' },
        { label: 'Agotado', value: 'agotado' },
      ],
    },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible en la página pública', defaultValue: true },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, admin: { description: 'Lo fija como un recurso prioritario en la vista pública.' } },
    { name: 'notes', type: 'textarea', label: 'Notas operativas' },
  ],
}
