import type { GlobalConfig } from 'payload'

import { isCoordinator } from '../lib/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Configuración del centro',
  admin: { group: 'Contenido' },
  access: {
    read: () => true,
    update: isCoordinator,
  },
  fields: [
    { name: 'centerName', type: 'text', label: 'Nombre del centro', required: true, maxLength: 160, defaultValue: 'Centro de acopio PLs al llamado' },
    { name: 'address', type: 'text', label: 'Dirección', required: true, maxLength: 240, defaultValue: 'Pereira, Risaralda · Dirección por confirmar' },
    { name: 'hours', type: 'text', label: 'Horarios', required: true, maxLength: 160, defaultValue: 'Lun — Sáb · 8:00 a.m. — 6:00 p.m.' },
    { name: 'centerStatus', type: 'select', label: 'Estado del centro', required: true, defaultValue: 'abierto', options: [
      { label: 'Abierto', value: 'abierto' },
      { label: 'Capacidad limitada', value: 'limitado' },
      { label: 'Cerrado', value: 'cerrado' },
    ] },
    { name: 'donationInstructions', type: 'textarea', label: 'Cómo donar', required: true, maxLength: 5000, defaultValue: 'Trae los recursos limpios, separados y marcados por categoría. Antes de salir, revisa la lista de necesidades urgentes.' },
    { name: 'heroMessage', type: 'textarea', label: 'Mensaje principal', required: true, maxLength: 3000, defaultValue: 'Estamos coordinando la recepción, organización y distribución de ayudas para las comunidades afectadas.' },
    { name: 'contactChannel', type: 'text', label: 'Canal de contacto', required: true, maxLength: 200, defaultValue: 'WhatsApp del equipo PLs al llamado · pendiente de confirmar' },
    { name: 'lastOperationalUpdate', type: 'date', label: 'Última actualización operativa' },
  ],
}
