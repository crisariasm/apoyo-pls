import { randomUUID } from 'node:crypto'
import type { CollectionConfig } from 'payload'

import { canManageDistribution, isPayloadAdminUser, publicVisibleRead } from '../lib/access'
import { isUUID } from '../lib/uuid'

function ensureEvidenceUUIDs(data: Record<string, unknown> | undefined) {
  if (!data || !Array.isArray(data.evidence)) return data

  return {
    ...data,
    evidence: data.evidence.map((item) => {
      if (!item || typeof item !== 'object') return item
      const evidence = item as Record<string, unknown>
      return { ...evidence, id: isUUID(evidence.id) ? evidence.id : randomUUID() }
    }),
  }
}

export const Distributions: CollectionConfig = {
  slug: 'distributions',
  admin: {
    useAsTitle: 'destination',
    defaultColumns: ['resourceName', 'quantity', 'destination', 'status', 'date'],
    group: 'Operación',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicVisibleRead,
    create: canManageDistribution,
    update: canManageDistribution,
    delete: canManageDistribution,
  },
  hooks: {
    beforeChange: [({ data }) => ensureEvidenceUUIDs(data as Record<string, unknown> | undefined)],
  },
  fields: [
    { name: 'resourceName', type: 'text', label: 'Recurso', required: true },
    { name: 'quantity', type: 'number', label: 'Cantidad', required: true, min: 1 },
    { name: 'unit', type: 'text', label: 'Presentación / medida', required: true, admin: { placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad distribuida.' } },
    { name: 'date', type: 'date', label: 'Fecha', required: true, defaultValue: () => new Date().toISOString() },
    { name: 'destination', type: 'text', label: 'Destino general', required: true },
    { name: 'organization', type: 'text', label: 'Equipo u organización receptora', required: true },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'pendiente',
      options: [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En ruta', value: 'en-ruta' },
        { label: 'Entregado', value: 'entregado' },
      ],
    },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible en el reporte público', defaultValue: true },
    { name: 'notes', type: 'textarea', label: 'Observaciones' },
    {
      name: 'evidence',
      type: 'array',
      label: 'Evidencias de la salida',
      admin: { hidden: true, description: 'Campo legado. Las nuevas evidencias se registran en la colección separada de evidencias de distribución.' },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true, label: 'Imagen' },
        { name: 'title', type: 'text', label: 'Título breve', required: true },
        { name: 'description', type: 'textarea', label: 'Descripción', required: true },
      ],
    },
  ],
}
