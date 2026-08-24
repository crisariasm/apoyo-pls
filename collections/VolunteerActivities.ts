import type { CollectionConfig } from 'payload'

import { canManageActivities, isPayloadAdminUser } from '../lib/access'

export const VolunteerActivities: CollectionConfig = {
  slug: 'volunteer-activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', 'status', 'featured', 'capacity'],
    group: 'Equipo',
  },
  access: {
    admin: isPayloadAdminUser,
    read: isPayloadAdminUser,
    create: canManageActivities,
    update: canManageActivities,
    delete: canManageActivities,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Actividad', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true },
    { name: 'date', type: 'date', label: 'Fecha', required: true, index: true },
    { name: 'startTime', type: 'text', label: 'Hora de inicio', required: true },
    { name: 'endTime', type: 'text', label: 'Hora de cierre', required: true },
    { name: 'location', type: 'text', label: 'Lugar', required: true },
    { name: 'capacity', type: 'number', label: 'Cupos', required: true, min: 1 },
    { name: 'registered', type: 'number', label: 'Personas inscritas', defaultValue: 0, min: 0 },
    {
      name: 'status',
      index: true,
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'abierta',
      options: [
        { label: 'Abierta', value: 'abierta' },
        { label: 'Llena', value: 'llena' },
        { label: 'Finalizada', value: 'finalizada' },
      ],
    },
    { name: 'featured', type: 'checkbox', label: 'Destacado', defaultValue: false, index: true, admin: { description: 'Lo fija como una de las próximas actividades prioritarias.' } },
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true, index: true },
    { name: 'lead', type: 'text', label: 'Persona responsable' },
  ],
}
