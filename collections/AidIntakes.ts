import type { CollectionConfig } from 'payload'

import { canManageAidIntakes, isPayloadAdminUser, publicVisibleRead } from '../lib/access'
import { resourceCategories } from '../lib/resource-categories'

export const AidIntakes: CollectionConfig = {
  slug: 'aid-intakes',
  admin: {
    useAsTitle: 'resourceName',
    defaultColumns: ['resourceName', 'quantity', 'sourceType', 'status', 'receivedAt'],
    group: 'Operación',
    description: 'Registro de ayudas recibidas antes de clasificarlas o incorporarlas al inventario.',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicVisibleRead,
    create: canManageAidIntakes,
    update: canManageAidIntakes,
    delete: canManageAidIntakes,
  },
  fields: [
    { name: 'resourceName', type: 'text', label: 'Ayuda recibida', required: true },
    { name: 'category', type: 'select', label: 'Categoría', required: true, options: resourceCategories.map(({ label, value }) => ({ label, value })) },
    { name: 'quantity', type: 'number', label: 'Cantidad recibida', required: true, min: 1 },
    { name: 'unit', type: 'text', label: 'Presentación / medida', required: true, admin: { description: 'Ej.: cajas, kits, litros o unidades. Indica qué representa la cantidad.' } },
    {
      name: 'sourceType',
      type: 'select',
      label: 'Origen',
      required: true,
      options: [
        { label: 'Donación comunitaria', value: 'donacion' },
        { label: 'Alianza u organización', value: 'alianza' },
        { label: 'Compra del equipo', value: 'compra' },
        { label: 'Préstamo', value: 'prestamo' },
        { label: 'Otro', value: 'otro' },
      ],
    },
    { name: 'sourceReference', type: 'text', label: 'Referencia del origen', admin: { description: 'Nombre de la organización o referencia interna. No publicar datos personales.' } },
    { name: 'receivedAt', type: 'date', label: 'Fecha de recepción', required: true, defaultValue: () => new Date().toISOString() },
    {
      name: 'status',
      type: 'select',
      label: 'Estado de clasificación',
      required: true,
      defaultValue: 'recibida',
      options: [
        { label: 'Recibida', value: 'recibida' },
        { label: 'En clasificación', value: 'en-clasificacion' },
        { label: 'Incorporada al inventario', value: 'incorporada' },
        { label: 'No apta', value: 'no-apta' },
      ],
    },
    { name: 'publicVisible', type: 'checkbox', label: 'Mostrar como ayuda recibida', defaultValue: true },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, admin: { description: 'Lo fija como una de las ayudas prioritarias en la vista pública.' } },
    { name: 'notes', type: 'textarea', label: 'Observaciones' },
  ],
}
