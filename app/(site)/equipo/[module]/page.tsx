import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { StaffModulePanel } from '../components/module-panel'
import { PortalShell } from '../components/portal-shell'
import { SupportRequestPanel } from '../components/support-request-panel'
import { canAccessModule, getPortalModule, getModulesForRole } from '../../../../lib/staff-portal-config'
import { getPortalOwnershipWhere, requireStaffSession } from '../../../../lib/staff-portal-auth'
import { sanitizePortalRecords } from '../../../../lib/portal-response'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 8

type PageProps = { params: Promise<{ module: string }> }

export default async function StaffModulePage({ params }: PageProps) {
  const session = await requireStaffSession()
  const { module: moduleSlug } = await params
  const moduleDefinition = getPortalModule(moduleSlug)
  if (!moduleDefinition) notFound()
  if (!canAccessModule(moduleDefinition, session.user.role)) redirect('/equipo')
  let moduleForView = moduleDefinition
  if (moduleDefinition.slug === 'evidencias') {
    const distributionResult = await session.payload.find({ collection: 'distributions', depth: 0, pagination: false, sort: '-date', where: getPortalOwnershipWhere(session.user, 'evidencias'), overrideAccess: true, user: session.user })
    const distributionOptions = distributionResult.docs.map((distribution) => {
      const record = distribution as unknown as Record<string, unknown>
      const date = record.date ? new Date(String(record.date)).toLocaleDateString('es-CO') : 'Sin fecha'
      return { label: `${String(record.resourceName || 'Ayuda')} · ${String(record.destination || 'Destino general')} · ${date}`, value: String(record.id) }
    })
    moduleForView = {
      ...moduleDefinition,
      fields: moduleDefinition.fields.map((field) => field.name === 'distribution' ? { ...field, options: distributionOptions } : field),
    }
  }
  const showAllRequests = moduleDefinition.slug === 'administracion'
  const result = await session.payload.find({ collection: moduleForView.collection, depth: 1, ...(showAllRequests ? { pagination: false } : { limit: PAGE_SIZE, page: 1 }), sort: '-updatedAt', where: getPortalOwnershipWhere(session.user, moduleForView.slug), overrideAccess: true, user: session.user })
  const records = sanitizePortalRecords(moduleForView, JSON.parse(JSON.stringify(result.docs)))
  const modules = getModulesForRole(session.user.role)

  return <PortalShell name={session.user.name} userId={session.user.id} role={session.user.role} modules={modules}><section className="staff-page-intro"><div><Link className="staff-back-link" href="/equipo">← Volver al resumen</Link><p className="staff-eyebrow">Módulo operativo</p><h1>{moduleDefinition.label}</h1><p>{moduleDefinition.description}</p></div></section>{showAllRequests ? <SupportRequestPanel initialRecords={records} canManage /> : <StaffModulePanel module={moduleForView} initialRecords={records} initialPage={result.page || 1} initialTotalPages={result.totalPages || 1} initialTotalDocs={result.totalDocs} />}</PortalShell>
}
