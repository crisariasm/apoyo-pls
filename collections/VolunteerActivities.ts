import type { CollectionConfig } from 'payload'

import { canManageActivities, isPayloadAdminUser, publicOpenStatusRead } from '../lib/access'

export const VolunteerActivities: CollectionConfig = {
  slug: 'volunteer-activities',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'location', 'status', 'capacity'],
    group: 'Equipo',
  },
  access: {
    admin: isPayloadAdminUser,
    read: publicOpenStatusRead,
    create: canManageActivities,
    update: canManageActivities,
    delete: canManageActivities,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Actividad', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción', required: true },
    { name: 'date', type: 'date', label: 'Fecha', required: true },
    { name: 'startTime', type: 'text', label: 'Hora de inicio', required: true },
    { name: 'endTime', type: 'text', label: 'Hora de cierre', required: true },
    { name: 'location', type: 'text', label: 'Lugar', required: true },
    { name: 'capacity', type: 'number', label: 'Cupos', required: true, min: 1 },
    { name: 'registered', type: 'number', label: 'Personas inscritas', defaultValue: 0, min: 0 },
    {
      name: 'status',
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
    { name: 'publicVisible', type: 'checkbox', label: 'Visible públicamente', defaultValue: true },
    { name: 'lead', type: 'text', label: 'Persona responsable' },
  ],
}
