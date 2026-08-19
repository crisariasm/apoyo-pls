export const portalRoleValues = [
  'que-tenemos',
  'que-necesitamos',
  'anuncios-boletin',
  'servicios',
  'inventario',
  'distribucion',
  'comunicados',
  'administracion',
] as const

export type PortalRole = (typeof portalRoleValues)[number]
export const dashboardRoleValues = portalRoleValues
export type DashboardRole = PortalRole
export type PortalModuleSlug = (typeof portalModuleSlugs)[number]
import { resourceCategories } from './resource-categories'

export type PortalFieldType = 'text' | 'textarea' | 'number' | 'date' | 'checkbox' | 'select' | 'upload'

export type PortalField = {
  name: string
  label: string
  type: PortalFieldType
  required?: boolean
  min?: number
  maxLength?: number
  placeholder?: string
  description?: string
  options?: Array<{ label: string; value: string }>
}

export type PortalModule = {
  slug: PortalModuleSlug
  label: string
  description: string
  collection: 'aid-intakes' | 'needs' | 'announcements' | 'bulletins' | 'services' | 'resources' | 'distributions' | 'distribution-evidence' | 'community-notices' | 'support-requests'
  roles: PortalRole[]
  titleField: string
  summaryFields: string[]
  fields: PortalField[]
  canCreate?: boolean
  canDelete?: boolean
}

export const portalModuleSlugs = [
  'tenemos',
  'necesitamos',
  'anuncios',
  'boletin',
  'servicios',
  'inventario',
  'distribucion',
  'evidencias',
  'comunicados',
  'administracion',
] as const

export const portalRoleLabels: Record<PortalRole, string> = {
  'que-tenemos': 'Rol que tenemos',
  'que-necesitamos': 'Rol que necesitamos',
  'anuncios-boletin': 'Rol de anuncios del centro y boletín informativo',
  servicios: 'Rol de servicios',
  inventario: 'Rol de inventario',
  distribucion: 'Rol de distribución',
  comunicados: 'Rol de comunicados',
  administracion: 'Rol de administración',
}

export const dashboardRoleLabels: Record<DashboardRole, string> = {
  ...portalRoleLabels,
}

const visibilityField: PortalField = { name: 'publicVisible', label: 'Visible públicamente', type: 'checkbox' }

export const portalModules: PortalModule[] = [
  {
    slug: 'tenemos',
    label: 'Qué tenemos',
    description: 'Registra las ayudas que llegan al centro, por donación o por solicitud.',
    collection: 'aid-intakes',
    roles: ['que-tenemos'],
    titleField: 'resourceName',
    summaryFields: ['quantity', 'unit', 'status', 'sourceType'],
    fields: [
      { name: 'resourceName', label: 'Ayuda recibida', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: resourceCategories.map((category) => ({ ...category })) },
      { name: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 1 },
      { name: 'unit', label: 'Presentación / medida', type: 'text', required: true, placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad registrada.' },
      { name: 'sourceType', label: 'Origen', type: 'select', required: true, options: [
        { label: 'Donación comunitaria', value: 'donacion' },
        { label: 'Alianza u organización', value: 'alianza' },
        { label: 'Compra del equipo', value: 'compra' },
        { label: 'Préstamo', value: 'prestamo' },
        { label: 'Otro', value: 'otro' },
      ] },
      { name: 'sourceReference', label: 'Referencia del origen', type: 'text' },
      { name: 'receivedAt', label: 'Fecha de recepción', type: 'date', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Recibida', value: 'recibida' },
        { label: 'En clasificación', value: 'en-clasificacion' },
        { label: 'Incorporada al inventario', value: 'incorporada' },
        { label: 'No apta', value: 'no-apta' },
      ] },
      visibilityField,
      { name: 'featured', label: 'Destacado', type: 'checkbox', description: 'Lo muestra primero como ayuda prioritaria.' },
      { name: 'notes', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'necesitamos',
    label: 'Qué necesitamos',
    description: 'Publica y actualiza las necesidades urgentes del centro y de las comunidades.',
    collection: 'needs',
    roles: ['que-necesitamos'],
    titleField: 'title',
    summaryFields: ['priority', 'status', 'zone'],
    fields: [
      { name: 'title', label: 'Necesidad', type: 'text', required: true },
      { name: 'detail', label: 'Detalle público', type: 'textarea', required: true },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: resourceCategories.map((category) => ({ ...category })) },
      { name: 'quantity', label: 'Cantidad aproximada', type: 'number', min: 1 },
      { name: 'unit', label: 'Presentación / medida', type: 'text', placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad solicitada.' },
      { name: 'priority', label: 'Prioridad', type: 'select', required: true, options: [
        { label: 'Crítica', value: 'critica' },
        { label: 'Alta', value: 'alta' },
        { label: 'Media', value: 'media' },
      ] },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Abierta', value: 'abierta' },
        { label: 'En gestión', value: 'en-gestion' },
        { label: 'Cubierta', value: 'cubierta' },
        { label: 'Cerrada', value: 'cerrada' },
      ] },
      { name: 'zone', label: 'Zona o destino general', type: 'text' },
      visibilityField,
      { name: 'featured', label: 'Destacado', type: 'checkbox', description: 'Lo muestra primero como necesidad prioritaria.' },
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
    ],
  },
  {
    slug: 'anuncios',
    label: 'Anuncios del centro',
    description: 'Publica cambios para el centro de acopio de horario, necesidades, rutas e información oficial.',
    collection: 'announcements',
    roles: ['anuncios-boletin'],
    titleField: 'title',
    summaryFields: ['type', 'status', 'publishedAt'],
    fields: [
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'body', label: 'Contenido', type: 'textarea', required: true },
      { name: 'type', label: 'Tipo', type: 'select', required: true, options: [
        { label: 'Horario', value: 'horario' },
        { label: 'Necesidad', value: 'necesidad' },
        { label: 'Distribución', value: 'distribucion' },
        { label: 'Información oficial', value: 'oficial' },
        { label: 'Impacto', value: 'impacto' },
      ] },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ] },
      { name: 'featured', label: 'Destacado', type: 'checkbox' },
      visibilityField,
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
      { name: 'expiresAt', label: 'Válido hasta', type: 'date' },
    ],
  },
  {
    slug: 'boletin',
    label: 'Boletín informativo',
    description: 'Redacta avances, registros y aprendizajes de la operación.',
    collection: 'bulletins',
    roles: ['anuncios-boletin'],
    titleField: 'title',
    summaryFields: ['category', 'status', 'publishedAt'],
    fields: [
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'summary', label: 'Resumen', type: 'textarea', required: true },
      { name: 'body', label: 'Contenido completo', type: 'textarea', required: true },
      { name: 'category', label: 'Categoría', type: 'text', required: true },
      { name: 'author', label: 'Equipo responsable', type: 'text', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ] },
      { name: 'featured', label: 'Destacado', type: 'checkbox' },
      visibilityField,
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
    ],
  },
  {
    slug: 'servicios',
    label: 'Servicios',
    description: 'Administra servicios gratuitos, ofrecidos por la comunidad o solicitados.',
    collection: 'services',
    roles: ['servicios'],
    titleField: 'title',
    summaryFields: ['type', 'category', 'status', 'location'],
    fields: [
      { name: 'title', label: 'Nombre del servicio', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea', required: true },
      { name: 'type', label: 'Tipo', type: 'select', required: true, options: [
        { label: 'Gratuito', value: 'gratuito' },
        { label: 'Ofrecido por la comunidad', value: 'ofrecido' },
        { label: 'Se necesita', value: 'necesitado' },
      ] },
      { name: 'category', label: 'Categoría', type: 'text', required: true },
      { name: 'provider', label: 'Persona, equipo u organización', type: 'text', required: true },
      { name: 'location', label: 'Zona o modalidad', type: 'text', required: true },
      { name: 'price', label: 'Costo o condición', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ] },
      visibilityField,
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
    ],
  },
  {
    slug: 'inventario',
    label: 'Inventario',
    description: 'Actualiza cantidades, estados y notas de los recursos disponibles.',
    collection: 'resources',
    roles: ['inventario'],
    titleField: 'name',
    summaryFields: ['category', 'quantity', 'unit', 'status'],
    fields: [
      { name: 'name', label: 'Recurso', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: resourceCategories.map((category) => ({ ...category })) },
      { name: 'quantity', label: 'Cantidad aproximada', type: 'number', required: true, min: 1 },
      { name: 'unit', label: 'Presentación / medida', type: 'text', required: true, placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad disponible.' },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Disponible', value: 'disponible' },
        { label: 'Limitado', value: 'limitado' },
        { label: 'Agotado', value: 'agotado' },
      ] },
      visibilityField,
      { name: 'featured', label: 'Destacado', type: 'checkbox', description: 'Lo muestra primero como recurso prioritario.' },
      { name: 'notes', label: 'Notas operativas', type: 'textarea' },
    ],
  },
  {
    slug: 'distribucion',
    label: 'Distribución',
    description: 'Registra salidas, destinos generales, estados y observaciones de las ayudas.',
    collection: 'distributions',
    roles: ['distribucion'],
    titleField: 'resourceName',
    summaryFields: ['quantity', 'unit', 'destination', 'status'],
    fields: [
      { name: 'resourceName', label: 'Recurso', type: 'text', required: true },
      { name: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 1 },
      { name: 'unit', label: 'Presentación / medida', type: 'text', required: true, placeholder: 'Ej.: cajas, kits, litros o unidades', description: 'Indica qué representa la cantidad distribuida.' },
      { name: 'date', label: 'Fecha', type: 'date', required: true },
      { name: 'destination', label: 'Destino general', type: 'text', required: true },
      { name: 'organization', label: 'Equipo u organización receptora', type: 'text', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En ruta', value: 'en-ruta' },
        { label: 'Entregado', value: 'entregado' },
      ] },
      visibilityField,
      { name: 'notes', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'evidencias',
    label: 'Evidencias',
    description: 'Registra imágenes y descripciones de las salidas, sin datos sensibles.',
    collection: 'distribution-evidence',
    roles: ['que-tenemos', 'que-necesitamos', 'anuncios-boletin', 'servicios', 'inventario', 'distribucion', 'comunicados', 'administracion'],
    titleField: 'title',
    summaryFields: ['sourceType', 'distribution', 'status', 'publishedAt'],
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'sourceType', label: 'Origen de la evidencia', type: 'select', required: true, options: [
        { label: 'Salida de distribución', value: 'distribucion' },
        { label: 'Otro registro operativo', value: 'otro' },
      ] },
      { name: 'distribution', label: 'Salida de distribución', type: 'select', options: [], description: 'Selecciona la salida que documenta esta evidencia.' },
      { name: 'otherReference', label: 'Referencia del otro registro', type: 'text', maxLength: 160, description: 'Indica qué actividad o registro documenta la imagen.' },
      { name: 'image', label: 'Imagen', type: 'upload', required: true, description: 'Imagen general de preparación o entrega. No incluyas rostros de menores, documentos ni ubicaciones sensibles.' },
      { name: 'title', label: 'Título breve', type: 'text', required: true, maxLength: 160 },
      { name: 'description', label: 'Descripción', type: 'textarea', required: true, maxLength: 2000, description: 'Explica qué muestra la imagen sin exponer datos personales.' },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ] },
      visibilityField,
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
    ],
  },
  {
    slug: 'comunicados',
    label: 'Comunicados',
    description: 'Modera publicaciones de la comunidad, mascotas encontradas, vivienda y otros avisos.',
    collection: 'community-notices',
    roles: ['comunicados'],
    titleField: 'title',
    summaryFields: ['category', 'location', 'status', 'publishedAt'],
    fields: [
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'body', label: 'Descripción', type: 'textarea', required: true },
      { name: 'category', label: 'Categoría', type: 'select', required: true, options: [
        { label: 'Mascota encontrada', value: 'mascota-encontrada' },
        { label: 'Apoyo comunitario', value: 'apoyo-comunitario' },
        { label: 'Objeto perdido', value: 'objeto-perdido' },
        { label: 'Información comunitaria', value: 'informacion-comunitaria' },
        { label: 'Vivienda', value: 'vivienda' },
        { label: 'Otro', value: 'otro' },
      ] },
      { name: 'location', label: 'Zona general', type: 'text', required: true },
      { name: 'contact', label: 'Canal o responsable', type: 'text', required: true },
      { name: 'status', label: 'Estado', type: 'select', required: true, options: [
        { label: 'Borrador', value: 'borrador' },
        { label: 'Publicado', value: 'publicado' },
        { label: 'Archivado', value: 'archivado' },
      ] },
      { name: 'featured', label: 'Destacado', type: 'checkbox' },
      visibilityField,
      { name: 'publishedAt', label: 'Fecha de publicación', type: 'date' },
    ],
  },
  {
    slug: 'administracion',
    label: 'Solicitudes',
    description: 'Consulta las solicitudes recibidas desde la página y revisa su estado de atención.',
    collection: 'support-requests',
    roles: ['que-tenemos', 'que-necesitamos', 'anuncios-boletin', 'servicios', 'inventario', 'distribucion', 'comunicados', 'administracion'],
    titleField: 'requestType',
    summaryFields: ['category', 'zone', 'status', 'contactName'],
    canCreate: false,
    canDelete: true,
    fields: [
      { name: 'status', label: 'Estado de atención', type: 'select', required: true, options: [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En revisión', value: 'en-revision' },
        { label: 'Asignada', value: 'asignada' },
        { label: 'Atendida', value: 'atendida' },
        { label: 'Cerrada', value: 'cerrada' },
      ] },
      { name: 'internalNotes', label: 'Notas internas', type: 'textarea' },
    ],
  },
]

export function getPortalModule(slug: string) {
  return portalModules.find((module) => module.slug === slug)
}

export function getModulesForRole(role: DashboardRole) {
  if (role === 'administracion') return portalModules
  return portalModules.filter((module) => module.roles.includes(role as PortalRole))
}

export function canAccessModule(module: PortalModule, role: DashboardRole) {
  return role === 'administracion' || module.roles.includes(role as PortalRole)
}
