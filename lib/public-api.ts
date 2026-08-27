import { getPayload } from 'payload'
import { unstable_noStore as noStore } from 'next/cache'

import config from '../payload.config'
import { buildWhatsAppUrl } from './whatsapp'

const hasDatabase = Boolean(process.env.DATABASE_URL)
type PayloadLike = Record<string, unknown>

type OverviewMode = 'live' | 'unavailable'
export type PublicResource = { id: string; name: string; category: string; quantity: number; unit: string; status: string; detail: string; featured: boolean }
export type PublicAidIntake = { id: string; resource: string; category: string; quantity: string; sourceType: string; status: string; receivedAt: string; featured: boolean }
export type PublicNeed = { id: string; title: string; detail: string; quantity: string; priority: string; zone: string; category: string; featured: boolean }
export type PublicAnnouncement = { id: string; type: string; title: string; time: string; tone: string; featured: boolean }
export type PublicDistribution = { id: string; resource: string; quantity: string; destination: string; organization: string; status: string; date: string; evidence: Array<{ id: string; image: string; title: string; description: string }> }
export type PublicEvidence = { id: string; image: string; title: string; description: string; source: string; distributionId: string }
export type PublicActivity = { id: string; title: string; date: string; time: string; location: string; spots: string; featured: boolean }
export type PublicNotice = { id: string; category: string; title: string; body: string; image: string; location: string; time: string; contact: string; featured: boolean }
export type PublicService = { id: string; type: string; typeLabel: string; category: string; title: string; description: string; image: string; provider: string; city: string; serviceMode: string; serviceModeLabel: string; location: string; availability: string; pricingType: string; pricingLabel: string; price: string; whatsappUrl: string; featured: boolean }
export type PublicBulletin = { id: string; category: string; title: string; summary: string; body: string; date: string; author: string; featured: boolean }

export type PublicOverview = {
  center: { name: string; address: string; hours: string; status: string; lastUpdate: string; contact: string }
  metrics: { received: string; available: string; distributed: string; volunteers: string }
  resources: PublicResource[]
  aidIntakes: PublicAidIntake[]
  needs: PublicNeed[]
  announcements: PublicAnnouncement[]
  distributions: PublicDistribution[]
  evidences: PublicEvidence[]
  activities: PublicActivity[]
  communityNotices: PublicNotice[]
  services: PublicService[]
  bulletins: PublicBulletin[]
  mode: OverviewMode
}

const emptyOverview: PublicOverview = {
  center: {
    name: 'Centro de acopio',
    address: 'Dirección pendiente de actualización',
    hours: 'Horario pendiente de actualización',
    status: 'pendiente',
    lastUpdate: 'Sin actualización disponible',
    contact: 'Teléfono del centro pendiente de actualización',
  },
  metrics: { received: '0', available: '0', distributed: '0', volunteers: '0' },
  resources: [], aidIntakes: [], needs: [], announcements: [], distributions: [], evidences: [], activities: [], communityNotices: [], services: [], bulletins: [], mode: 'unavailable',
}

const text = (value: unknown, fallback = '') => typeof value === 'string' && value ? value : fallback

function dateLabel(value: unknown, fallback: string) {
  if (!value) return fallback
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '')
}

function dateTimeLabel(value: unknown, fallback: string) {
  if (!value) return fallback
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).replace('.', '')
}

function categoryLabel(value: unknown) {
  const labels: Record<string, string> = { alimentos: 'Alimentos', agua: 'Agua', aseo: 'Kits de aseo', salud: 'Medicamentos y primeros auxilios', abrigo: 'Ropa y cobijas', bebes: 'Elementos para bebés', herramientas: 'Herramientas', mascotas: 'Elementos para mascotas', cocina: 'Cocina', higiene: 'Higiene personal', transporte: 'Transporte', alojamiento: 'Alojamiento', energia: 'Energía e iluminación', construccion: 'Materiales de construcción', otros: 'Otros' }
  return labels[text(value)] || text(value, 'Otros')
}

function priorityLabel(value: unknown) {
  const labels: Record<string, string> = { critica: 'Crítica', crítica: 'Crítica', alta: 'Alta', media: 'Media' }
  return labels[text(value)] || text(value, 'Media')
}

function statusLabel(value: unknown) {
  const labels: Record<string, string> = { entregado: 'Entregado', 'en-ruta': 'En ruta', 'en ruta': 'En ruta', pendiente: 'Pendiente' }
  return labels[text(value)] || text(value, 'Pendiente')
}

function announcementTone(value: unknown) {
  const tones: Record<string, string> = { horario: 'green', necesidad: 'orange', distribucion: 'orange', voluntariado: 'blue', oficial: 'green', impacto: 'blue' }
  return tones[text(value)] || 'green'
}

function noticeCategoryLabel(value: unknown) {
  const labels: Record<string, string> = { 'mascota-encontrada': 'Mascota encontrada', 'apoyo-comunitario': 'Apoyo comunitario', 'objeto-perdido': 'Objeto perdido', 'informacion-comunitaria': 'Información comunitaria', vivienda: 'Vivienda', otro: 'Otro' }
  return labels[text(value)] || text(value, 'Información comunitaria')
}

function serviceTypeLabel(value: unknown) {
  const labels: Record<string, string> = { gratuito: 'Gratis', ofrecido: 'Disponible', necesitado: 'Solicitud de apoyo' }
  return labels[text(value)] || text(value, 'Servicio comunitario')
}

function serviceMode(value: unknown, location: unknown) {
  const current = text(value)
  if (current) return current
  const normalizedLocation = text(location).toLowerCase()
  if (normalizedLocation.includes('remoto')) return 'remoto'
  if (normalizedLocation.includes('domicilio')) return 'domicilio'
  return 'presencial'
}

function serviceModeLabel(value: unknown) {
  const labels: Record<string, string> = { presencial: 'Presencial', domicilio: 'A domicilio', remoto: 'Remoto', hibrido: 'Híbrido' }
  return labels[text(value)] || 'Presencial'
}

function servicePricingType(value: unknown, type: unknown, price: unknown) {
  const current = text(value)
  const normalizedPrice = text(price).toLowerCase()
  const currentType = text(type)
  if (currentType === 'gratuito' || normalizedPrice.includes('gratis') || normalizedPrice.includes('sin costo')) return 'gratis'
  if (normalizedPrice.includes('convenir') || normalizedPrice.includes('negoci')) return 'negociable'
  if (currentType === 'necesitado' || normalizedPrice.includes('se necesita')) return 'por-definir'
  if (current) return current
  if (/\$|\d/.test(normalizedPrice)) return 'pagado'
  return 'por-definir'
}

function servicePricingLabel(value: unknown) {
  const labels: Record<string, string> = { gratis: 'Gratis', pagado: 'De pago', negociable: 'Tarifa negociable', intercambio: 'Intercambio o aporte', 'por-definir': 'Por definir' }
  return labels[text(value)] || 'Por definir'
}

function serviceCity(value: unknown, location: unknown) {
  const current = text(value)
  const knownCities = ['Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella', 'Cartago', 'Armenia', 'Manizales', 'Medellín', 'Medellin', 'Bogotá', 'Bogota', 'Cali']
  const currentLocation = text(location)
  if (currentLocation.toLowerCase().includes('remoto')) return 'Remoto / toda Colombia'
  const match = knownCities.find((city) => currentLocation.toLowerCase().includes(city.toLowerCase()))
  if (match) return match === 'Medellin' ? 'Medellín' : match === 'Bogota' ? 'Bogotá' : match
  return current || 'Pereira'
}

function intakeStatusLabel(value: unknown) {
  const labels: Record<string, string> = { recibida: 'Recibida', 'en-clasificacion': 'En clasificación', incorporada: 'Incorporada al inventario', 'no-apta': 'No apta' }
  return labels[text(value)] || text(value, 'Recibida')
}

function intakeSourceLabel(value: unknown) {
  const labels: Record<string, string> = { donacion: 'Donación comunitaria', alianza: 'Alianza u organización', compra: 'Compra del equipo', prestamo: 'Préstamo', otro: 'Otro' }
  return labels[text(value)] || text(value, 'Origen comunitario')
}

function metricLabel(value: number) {
  return value.toLocaleString('es-CO')
}

export type PublicOverviewSection =
  | 'resources'
  | 'aidIntakes'
  | 'needs'
  | 'announcements'
  | 'distributions'
  | 'evidences'
  | 'activities'
  | 'communityNotices'
  | 'services'
  | 'bulletins'

// El frontend limita visualmente las listas mediante contenedores desplazables;
// mantenemos este margen para no ocultar registros públicos cuando crecen.
const publicLimit = 100

function mediaUrl(value: unknown, fallback = '/hero-PLs-al-llamado.png') {
  if (typeof value === 'string' && value.startsWith('/')) return /^\/api\/media\/?$/.test(value) ? fallback : value
  if (value && typeof value === 'object') {
    const media = value as PayloadLike
    const mediaId = typeof media.id === 'string' ? media.id : ''
    if (media.r2Key && mediaId) return `/api/media/${encodeURIComponent(mediaId)}`
    const legacyUrl = typeof media.url === 'string' ? media.url.trim() : ''
    return legacyUrl && !/^\/api\/media\/?$/.test(legacyUrl) ? legacyUrl : fallback
  }
  return fallback
}

function relationId(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return text((value as PayloadLike).id)
  return ''
}

export async function getOverview(options: { sections?: readonly PublicOverviewSection[] } = {}): Promise<PublicOverview> {
  noStore()
  if (!hasDatabase) return emptyOverview

  try {
    const payload = await getPayload({ config })
    const requestedSections = options.sections ? new Set(options.sections) : null
    const wants = (section: PublicOverviewSection) => requestedSections === null || requestedSections.has(section)
    // Cada módulo se consulta de forma aislada. Así un problema puntual en una
    // colección no hace que desaparezca toda la información pública.
    const safeFind = async (query: Record<string, unknown>) => {
      try {
        const result = await payload.find({ ...query, overrideAccess: true } as never)
        return result.docs as unknown as PayloadLike[]
      } catch {
        return [] as PayloadLike[]
      }
    }
    const safeFindGlobal = async () => {
      try {
        return await payload.findGlobal({ slug: 'site-settings', overrideAccess: true }) as unknown as PayloadLike
      } catch {
        return {} as PayloadLike
      }
    }

    const [resourceDocsRaw, aidIntakeDocsRaw, needDocsRaw, announcementDocsRaw, distributionDocs, evidenceDocs, activityDocs, noticeDocsRaw, serviceDocsRaw, bulletinDocsRaw, settingsData] = await Promise.all([
      wants('resources') ? safeFind({ collection: 'resources', depth: 0, where: { publicVisible: { equals: true } }, limit: publicLimit, sort: ['-featured', '-updatedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('aidIntakes') ? safeFind({ collection: 'aid-intakes', depth: 0, where: { publicVisible: { equals: true } }, limit: publicLimit, sort: ['-featured', '-receivedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('needs') ? safeFind({ collection: 'needs', depth: 0, where: { and: [{ publicVisible: { equals: true } }, { status: { not_equals: 'cerrada' } }] }, limit: publicLimit, sort: ['-featured', '-updatedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('announcements') ? safeFind({ collection: 'announcements', depth: 0, where: { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] }, limit: publicLimit, sort: ['-featured', '-publishedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('distributions') ? safeFind({ collection: 'distributions', depth: 1, where: { publicVisible: { equals: true } }, limit: publicLimit, sort: ['-date', '-createdAt'] }) : Promise.resolve([]),
      wants('evidences') ? safeFind({ collection: 'distribution-evidence', depth: 1, where: { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] }, limit: publicLimit, sort: ['-publishedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('activities') ? safeFind({ collection: 'volunteer-activities', depth: 0, where: { and: [{ status: { equals: 'abierta' } }, { publicVisible: { equals: true } }] }, limit: publicLimit, sort: ['-featured', 'date', '-createdAt'] }) : Promise.resolve([]),
      wants('communityNotices') ? safeFind({ collection: 'community-notices', depth: 1, where: { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }, { category: { not_equals: 'mascota-perdida' } }] }, limit: publicLimit, sort: ['-featured', '-publishedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('services') ? safeFind({ collection: 'services', depth: 1, where: { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] }, limit: publicLimit, sort: ['-publishedAt', '-createdAt'] }) : Promise.resolve([]),
      wants('bulletins') ? safeFind({ collection: 'bulletins', depth: 0, where: { and: [{ status: { equals: 'publicado' } }, { publicVisible: { equals: true } }] }, limit: publicLimit, sort: ['-featured', '-publishedAt', '-createdAt'] }) : Promise.resolve([]),
      safeFindGlobal(),
    ])

    // El orden destacado ya lo resuelve PostgreSQL mediante `sort`; volver a
    // ordenar aquí duplicaba trabajo y podía alterar el orden secundario.
    const resourceDocs = resourceDocsRaw as PayloadLike[]
    const aidIntakeDocs = aidIntakeDocsRaw as PayloadLike[]
    const needDocs = needDocsRaw as PayloadLike[]
    const announcementDocs = announcementDocsRaw as PayloadLike[]
    const noticeDocs = noticeDocsRaw as PayloadLike[]
    const serviceDocs = serviceDocsRaw as PayloadLike[]
    const bulletinDocs = bulletinDocsRaw as PayloadLike[]
    const evidenceByDistribution = new Map<string, PayloadLike[]>()
    for (const evidence of evidenceDocs) {
      const distributionId = relationId(evidence.distribution)
      if (!distributionId) continue
      const current = evidenceByDistribution.get(distributionId) || []
      current.push(evidence)
      evidenceByDistribution.set(distributionId, current)
    }
    const receivedTotal = aidIntakeDocs.reduce((total, intake) => total + Number(intake.quantity || 0), 0)
    const availableTotal = resourceDocs.reduce((total, resource) => total + Number(resource.quantity || 0), 0)
    const distributedTotal = distributionDocs.filter((distribution) => text(distribution.status) === 'entregado').reduce((total, distribution) => total + Number(distribution.quantity || 0), 0)
    const mappedDistributions = distributionDocs.map((distribution) => {
      const distributionId = text(distribution.id, crypto.randomUUID())
      const legacyEvidenceItems = Array.isArray(distribution.evidence) ? distribution.evidence as unknown[] : []
      const separateEvidenceItems = evidenceByDistribution.get(distributionId) || []
      const evidenceItems = [...separateEvidenceItems, ...legacyEvidenceItems].filter((item, index, items) => {
        const current = item as PayloadLike
        const currentId = text(current.id)
        const currentTitle = text(current.title)
        return items.findIndex((candidate) => {
          const other = candidate as PayloadLike
          return (currentId && currentId === text(other.id)) || (currentTitle && currentTitle === text(other.title))
        }) === index
      })
      return { id: distributionId, resource: text(distribution.resourceName, 'Ayuda'), quantity: `${distribution.quantity || 0} ${text(distribution.unit, 'unidades')}`, destination: text(distribution.destination, 'Destino general'), organization: text(distribution.organization, 'Equipo de distribución'), status: statusLabel(distribution.status), date: dateLabel(distribution.date, 'Por confirmar'), evidence: evidenceItems.map((item) => { const evidence = item as PayloadLike; return { id: text(evidence.id, crypto.randomUUID()), image: mediaUrl(evidence.image || evidence.publicImagePath), title: text(evidence.title, 'Evidencia de la salida'), description: text(evidence.description, 'Registro visual de la preparación o entrega.') } }) }
    })
    const separateEvidences = evidenceDocs.map((evidence) => {
      const relation = evidence.distribution && typeof evidence.distribution === 'object' ? evidence.distribution as PayloadLike : {}
      const distributionId = relationId(evidence.distribution)
      return { id: text(evidence.id, crypto.randomUUID()), image: mediaUrl(evidence.image || evidence.publicImagePath), title: text(evidence.title, 'Evidencia de la operación'), description: text(evidence.description, 'Registro visual de la operación.'), source: distributionId ? `${text(relation.resourceName, 'Ayuda')} · ${text(relation.destination, 'Distribución')}` : text(evidence.otherReference, 'Registro operativo general'), distributionId }
    })
    const legacyEvidences = mappedDistributions.flatMap((distribution) => distribution.evidence.map((evidence) => ({ ...evidence, source: `${distribution.resource} · ${distribution.destination}`, distributionId: distribution.id })))
    const evidences = [...separateEvidences, ...legacyEvidences].filter((evidence, index, items) => items.findIndex((other) => `${other.distributionId}:${other.title}` === `${evidence.distributionId}:${evidence.title}`) === index)

    return {
      center: {
        name: text(settingsData.centerName, emptyOverview.center.name), address: text(settingsData.address, emptyOverview.center.address), hours: text(settingsData.hours, emptyOverview.center.hours), status: text(settingsData.centerStatus, emptyOverview.center.status), lastUpdate: dateTimeLabel(settingsData.lastOperationalUpdate, emptyOverview.center.lastUpdate), contact: text(settingsData.phone, emptyOverview.center.contact),
      },
      // `notes` y `sourceReference` son campos operativos: no forman parte del
      // contrato público aunque el registro esté marcado como visible.
      resources: resourceDocs.map((resource) => ({ id: text(resource.id, crypto.randomUUID()), name: text(resource.name, 'Recurso sin nombre'), category: categoryLabel(resource.category), quantity: Number(resource.quantity || 0), unit: text(resource.unit, 'unidades'), status: text(resource.status, 'disponible'), detail: 'Existencia registrada por el equipo de inventario.', featured: resource.featured === true })),
      aidIntakes: aidIntakeDocs.map((intake) => ({ id: text(intake.id, crypto.randomUUID()), resource: text(intake.resourceName, 'Ayuda recibida'), category: categoryLabel(intake.category), quantity: `${intake.quantity || 0} ${text(intake.unit, 'unidades')}`, sourceType: intakeSourceLabel(intake.sourceType), status: intakeStatusLabel(intake.status), receivedAt: dateTimeLabel(intake.receivedAt, 'Recibida recientemente'), featured: intake.featured === true })),
      needs: needDocs.map((need) => ({ id: text(need.id, crypto.randomUUID()), title: text(need.title, 'Necesidad del centro'), detail: text(need.detail, 'Detalle pendiente de actualización.'), quantity: need.quantity ? `${need.quantity} ${text(need.unit, '')}`.trim() : 'Por confirmar', priority: priorityLabel(need.priority), zone: text(need.zone, 'Zona por confirmar'), category: text(need.category, 'General'), featured: need.featured === true })),
      announcements: announcementDocs.map((announcement) => ({ id: text(announcement.id, crypto.randomUUID()), type: text(announcement.type, 'Información'), title: text(announcement.title, 'Actualización del centro'), time: dateTimeLabel(announcement.publishedAt, 'Publicado recientemente'), tone: announcementTone(announcement.type), featured: announcement.featured === true })),
      distributions: mappedDistributions,
      evidences,
      activities: activityDocs.map((activity) => ({ id: text(activity.id, crypto.randomUUID()), title: text(activity.title, 'Actividad del centro'), date: dateLabel(activity.date, 'Próximo'), time: `${text(activity.startTime, 'Hora por confirmar')} — ${text(activity.endTime, 'hora de cierre')}`, location: text(activity.location, 'Centro de acopio'), spots: `${Math.max(0, Number(activity.capacity || 0) - Number(activity.registered || 0))} cupos`, featured: activity.featured === true })),
      communityNotices: noticeDocs.map((notice) => ({ id: text(notice.id, crypto.randomUUID()), category: noticeCategoryLabel(notice.category), title: text(notice.title, 'Comunicado comunitario'), body: text(notice.body, 'Información compartida por la comunidad.'), image: mediaUrl(notice.image || notice.publicImagePath), location: text(notice.location, 'Zona general'), time: dateTimeLabel(notice.publishedAt, 'Publicado recientemente'), contact: text(notice.contact, 'Equipo de comunicaciones'), featured: notice.featured === true })),
      services: serviceDocs.map((service) => {
        const type = text(service.type, 'gratuito')
        const location = text(service.location, 'Zona general')
        const currentPricingType = servicePricingType(service.pricingType, type, service.price)
        const currentMode = serviceMode(service.serviceMode, location)
        const currentPrice = text(service.price, currentPricingType === 'gratis' ? 'Sin costo' : 'Consultar')
        return { id: text(service.id, crypto.randomUUID()), type, typeLabel: serviceTypeLabel(type), category: text(service.category, 'General'), title: text(service.title, 'Servicio comunitario'), description: text(service.description, 'Información del servicio disponible.'), image: mediaUrl(service.image, '/hero-PLs-al-llamado.png'), provider: text(service.provider, 'Comunidad'), city: serviceCity(service.city, location), serviceMode: currentMode, serviceModeLabel: serviceModeLabel(currentMode), location, availability: text(service.availability, 'Consulta disponibilidad'), pricingType: currentPricingType, pricingLabel: servicePricingLabel(currentPricingType), price: currentPrice, whatsappUrl: buildWhatsAppUrl(service.whatsappCountryCode, service.whatsappNumber, text(service.title, 'servicio comunitario')), featured: service.featured === true }
      }),
      bulletins: bulletinDocs.map((bulletin) => ({ id: text(bulletin.id, crypto.randomUUID()), category: text(bulletin.category, 'Actualización'), title: text(bulletin.title, 'Boletín del centro'), summary: text(bulletin.summary, 'Actualización de la operación comunitaria.'), body: text(bulletin.body, 'Consulta los avances del centro de acopio.'), date: dateLabel(bulletin.publishedAt, 'Por confirmar'), author: text(bulletin.author, 'Equipo del centro'), featured: bulletin.featured === true })),
      metrics: { received: metricLabel(receivedTotal), available: metricLabel(availableTotal), distributed: metricLabel(distributedTotal), volunteers: metricLabel(activityDocs.length) },
      mode: 'live',
    }
  } catch {
    return emptyOverview
  }
}
