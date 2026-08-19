import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import { getPayload } from 'payload'

import config from '../payload.config'
import {
  seedActivities,
  seedAidIntakes,
  seedAnnouncements,
  seedBulletins,
  seedCommunityNotices,
  seedDistributions,
  seedNeeds,
  seedResources,
  seedServices,
  seedSupportRequests,
} from './seed-data'

const categoryValues: Record<string, string> = {
  Alimentos: 'alimentos',
  Agua: 'agua',
  Aseo: 'aseo',
  Salud: 'salud',
  Abrigo: 'abrigo',
  Bebés: 'bebes',
  Herramientas: 'herramientas',
  Mascotas: 'mascotas',
  Cocina: 'cocina',
  'Higiene personal': 'higiene',
  Transporte: 'transporte',
  Alojamiento: 'alojamiento',
  'Energía e iluminación': 'energia',
  'Materiales de construcción': 'construccion',
  Otros: 'otros',
}

const priorityValues: Record<string, string> = { Crítica: 'critica', Alta: 'alta', Media: 'media' }
const distributionStatusValues: Record<string, string> = { Entregado: 'entregado', 'En ruta': 'en-ruta', Pendiente: 'pendiente' }
const aidSourceValues: Record<string, string> = {
  'Donación comunitaria': 'donacion',
  'Alianza u organización': 'alianza',
  'Compra del equipo': 'compra',
  Préstamo: 'prestamo',
  Otro: 'otro',
}
const aidStatusValues: Record<string, string> = {
  Recibida: 'recibida',
  'En clasificación': 'en-clasificacion',
  'Incorporada al inventario': 'incorporada',
  'No apta': 'no-apta',
}
const announcementTypeValues: Record<string, string> = {
  horario: 'horario',
  necesidad: 'necesidad',
  distribución: 'distribucion',
  distribucion: 'distribucion',
  voluntariado: 'voluntariado',
  información: 'oficial',
  informacion: 'oficial',
  inventario: 'oficial',
  actividad: 'voluntariado',
  agradecimiento: 'impacto',
  actualización: 'oficial',
  actualizacion: 'oficial',
}

const numberFromLabel = (value: string) => Number.parseInt(value, 10) || 0
const unitFromLabel = (value: string) => value.replace(/^\d+\s*/, '') || 'unidades'
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')

const mediaFiles = [
  { key: '/community-notice-animals.png', alt: 'Animales encontrados y acompañados por la red comunitaria.' },
  { key: '/community-notice-housing.png', alt: 'Casa disponible en arriendo compartida por la comunidad.' },
  { key: '/hero-PLs-al-llamado.png', alt: 'Personas organizando ayudas en el centro de acopio.' },
]

const resources = seedResources.map((resource, index) => ({
  name: resource.name,
  category: categoryValues[resource.category] || 'otros',
  quantity: Number(resource.quantity),
  unit: resource.unit,
  status: resource.status,
  publicVisible: true,
  featured: index < 6,
  notes: resource.detail,
}))

const aidIntakes = seedAidIntakes.map((intake, index) => ({
  resourceName: intake.resource,
  category: categoryValues[intake.category] || 'otros',
  quantity: numberFromLabel(intake.quantity),
  unit: unitFromLabel(intake.quantity),
  sourceType: aidSourceValues[intake.sourceType] || 'otro',
  sourceReference: intake.sourceReference,
  receivedAt: new Date(Date.now() - index * 18 * 60 * 60 * 1000).toISOString(),
  status: aidStatusValues[intake.status] || 'recibida',
  publicVisible: intake.publicVisible,
  featured: index < 2,
  notes: intake.notes,
}))

const needs = seedNeeds.map((need, index) => ({
  title: need.title,
  detail: need.detail,
  category: categoryValues[need.category] || 'otros',
  quantity: numberFromLabel(need.quantity),
  unit: unitFromLabel(need.quantity),
  priority: priorityValues[need.priority] || 'media',
  status: 'abierta',
  zone: need.zone,
  publicVisible: true,
  featured: index < 4,
  publishedAt: new Date(Date.now() - index * 3 * 60 * 60 * 1000).toISOString(),
}))

const announcements = seedAnnouncements.map((announcement, index) => ({
  title: announcement.title,
  body: announcement.body,
  type: announcementTypeValues[announcement.type.toLowerCase()] || 'oficial',
  status: 'publicado',
  publicVisible: true,
  featured: index < 3,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + (index < 5 ? 7 : 3) * 24 * 60 * 60 * 1000).toISOString(),
}))

const distributions = seedDistributions.map((distribution, index) => ({
  resourceName: distribution.resource,
  quantity: numberFromLabel(distribution.quantity),
  unit: unitFromLabel(distribution.quantity),
  date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString(),
  destination: distribution.destination,
  organization: distribution.organization,
  status: distributionStatusValues[distribution.status] || 'pendiente',
  publicVisible: true,
  notes: `Registro operativo inicial para la ruta ${distribution.date}.`,
}))

const activities = seedActivities.map((activity, index) => {
  const [startTime, endTime] = activity.time.split(' — ')
  const capacity = numberFromLabel(activity.spots)
  return {
    title: activity.title,
    description: `Actividad abierta de apoyo para el centro de acopio. ${activity.location}.`,
    date: new Date(Date.now() + Math.max(0, index - 1) * 24 * 60 * 60 * 1000).toISOString(),
    startTime: startTime || 'Hora por confirmar',
    endTime: endTime || 'Hora de cierre',
    location: activity.location,
    capacity: Math.max(capacity, 1),
    registered: 0,
    status: 'abierta',
    publicVisible: true,
    lead: 'Coordinación de actividades',
  }
})

const communityNotices = seedCommunityNotices.map((notice, index) => ({
  title: notice.title,
  body: notice.body,
  category: slugify(notice.category),
  imageKey: notice.image,
  location: notice.location,
  contact: notice.contact,
  status: 'publicado',
  publicVisible: true,
  featured: index < 2,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
}))

const services = seedServices.map((service, index) => ({
  title: service.title,
  description: service.description,
  type: service.type,
  category: service.category,
  provider: service.provider,
  location: service.location,
  price: service.price,
  status: 'publicado',
  publicVisible: true,
  featured: index < 3,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
}))

const bulletins = seedBulletins.map((bulletin, index) => ({
  title: bulletin.title,
  summary: bulletin.summary,
  body: bulletin.body,
  category: bulletin.category,
  author: bulletin.author,
  status: 'publicado',
  publicVisible: true,
  featured: index < 2,
  publishedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
}))

const seedAdminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@plsalllamado.local'
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'PLsAdmin2026!'
const seedSuperAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@plsalllamado.local'
const seedSuperAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'PLsSuper2026!'
const seedPortalEmail = process.env.SEED_PORTAL_EMAIL || 'administracion@plsalllamado.local'
const seedPortalPassword = process.env.SEED_PORTAL_PASSWORD || 'PLsEquipo2026!'
const seedAuditActor = 'Administrador de prueba'

const portalSeedUsers = [
  { email: seedPortalEmail, name: 'Equipo de administración', role: 'administracion' },
  { email: 'que-tenemos@plsalllamado.local', name: 'Equipo que tenemos', role: 'que-tenemos' },
  { email: 'que-necesitamos@plsalllamado.local', name: 'Equipo que necesitamos', role: 'que-necesitamos' },
  { email: 'anuncios@plsalllamado.local', name: 'Equipo de anuncios y boletín', role: 'anuncios-boletin' },
  { email: 'servicios@plsalllamado.local', name: 'Equipo de servicios', role: 'servicios' },
  { email: 'inventario@plsalllamado.local', name: 'Equipo de inventario', role: 'inventario' },
  { email: 'distribucion@plsalllamado.local', name: 'Equipo de distribución', role: 'distribucion' },
  { email: 'comunicados@plsalllamado.local', name: 'Equipo de comunicados', role: 'comunicados' },
]

async function seed() {
  const payload = await getPayload({ config })
  type SeedCollection = 'resources' | 'aid-intakes' | 'needs' | 'announcements' | 'distributions' | 'distribution-evidence' | 'volunteer-activities' | 'community-notices' | 'services' | 'bulletins' | 'support-requests'

  const ensure = async (collection: SeedCollection, lookupFields: string[], data: Record<string, unknown>) => {
    const where = { and: lookupFields.map((field) => ({ [field]: { equals: data[field] } })) }
    const existing = await payload.find({ collection, where, limit: 1, overrideAccess: true })
    if (existing.docs.length) {
      const previous = existing.docs[0] as unknown as Record<string, unknown>
      const auditedData = {
        ...data,
        registeredBy: previous.registeredBy === 'Seeder inicial PLs al llamado' ? seedAuditActor : previous.registeredBy || seedAuditActor,
        updatedBy: previous.updatedBy === 'Seeder inicial PLs al llamado' ? seedAuditActor : previous.updatedBy || seedAuditActor,
      }
      await payload.update({ collection, id: existing.docs[0].id, data: auditedData, overrideAccess: true })
      return existing.docs[0].id
    }
    const created = await payload.create({ collection, data: { ...data, registeredBy: seedAuditActor, updatedBy: seedAuditActor }, overrideAccess: true })
    return created.id
  }

  const mediaIds: Record<string, string> = {}
  for (const media of mediaFiles) {
    const filePath = resolve(process.cwd(), 'public', media.key.slice(1))
    if (!existsSync(filePath)) throw new Error(`No se encontró el archivo multimedia ${filePath}`)
    const filename = basename(filePath)
    const existing = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, overrideAccess: true })
    if (existing.docs.length) {
      mediaIds[media.key] = String(existing.docs[0].id)
    } else {
      const created = await payload.create({ collection: 'media', data: { alt: media.alt }, filePath, overrideAccess: true })
      mediaIds[media.key] = String(created.id)
    }
  }

  for (const resource of resources) await ensure('resources', ['name'], resource)
  for (const intake of aidIntakes) await ensure('aid-intakes', ['resourceName', 'sourceReference'], intake)
  for (const need of needs) await ensure('needs', ['title'], need)
  for (const announcement of announcements) await ensure('announcements', ['title'], announcement)
  for (const activity of activities) await ensure('volunteer-activities', ['title'], activity)
  for (const service of services) await ensure('services', ['title'], service)
  for (const bulletin of bulletins) await ensure('bulletins', ['title'], bulletin)
  for (const request of seedSupportRequests) await ensure('support-requests', ['requestType', 'category', 'zone'], request)

  for (const [index, distribution] of distributions.entries()) {
    const distributionId = await ensure('distributions', ['resourceName', 'destination', 'quantity'], distribution)
    const source = seedDistributions[index]
    for (const item of source.evidence) {
      await ensure('distribution-evidence', ['title', 'distribution'], {
        sourceType: 'distribucion',
        distribution: distributionId,
        image: mediaIds[item.image] || mediaIds['/hero-PLs-al-llamado.png'],
        title: item.title,
        description: item.description,
        status: 'publicado',
        publicVisible: true,
        publishedAt: new Date().toISOString(),
      })
    }
  }

  for (const notice of communityNotices) {
    const { imageKey, ...noticeData } = notice
    await ensure('community-notices', ['title'], { ...noticeData, image: mediaIds[imageKey] })
  }

  await payload.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    data: {
      centerName: 'Centro de acopio PLs al llamado',
      address: 'Pereira, Risaralda · Dirección por confirmar',
      hours: 'Lun — Sáb · 8:00 a.m. — 6:00 p.m.',
      centerStatus: 'abierto',
      donationInstructions: 'Trae los recursos limpios, separados y marcados por categoría. Antes de salir, revisa la lista de necesidades urgentes.',
      heroMessage: 'Estamos coordinando la recepción, organización y distribución de ayudas para las comunidades afectadas.',
      contactChannel: 'WhatsApp del equipo PLs al llamado · pendiente de confirmar',
      lastOperationalUpdate: new Date().toISOString(),
    },
  })

  const seedUsers = [
    { email: seedAdminEmail, password: seedAdminPassword, name: 'Administrador de prueba', role: 'admin' },
    { email: seedSuperAdminEmail, password: seedSuperAdminPassword, name: 'Super administrador de prueba', role: 'super-admin' },
    ...portalSeedUsers.map((user) => ({ ...user, password: seedPortalPassword })),
  ]
  for (const user of seedUsers) {
    const existingUser = await payload.find({ collection: 'users', where: { email: { equals: user.email } }, limit: 1, overrideAccess: true })
    const previous = existingUser.docs[0] as unknown as Record<string, unknown> | undefined
    const userData = { ...user, phone: '300 000 0000', active: true, registeredBy: previous?.registeredBy === 'Seeder inicial PLs al llamado' ? seedAuditActor : previous?.registeredBy || seedAuditActor, updatedBy: previous?.updatedBy === 'Seeder inicial PLs al llamado' ? seedAuditActor : previous?.updatedBy || seedAuditActor }
    if (existingUser.docs.length) {
      await payload.update({ collection: 'users', id: existingUser.docs[0].id, data: userData, overrideAccess: true })
    } else {
      await payload.create({ collection: 'users', data: userData, overrideAccess: true })
    }
  }

  console.log(`PLs al llamado: ${resources.length} recursos, ${aidIntakes.length} ayudas recibidas, ${needs.length} necesidades, ${announcements.length} anuncios, ${distributions.length} distribuciones, ${communityNotices.length} comunicados, ${services.length} servicios, ${bulletins.length} boletines y ${seedSupportRequests.length} solicitudes listas.`)
  console.log(`Usuarios de Payload listos para /admin: ${seedAdminEmail}, ${seedSuperAdminEmail}`)
  console.log(`Usuarios operativos listos para /equipo/login: ${portalSeedUsers.length}`)
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
