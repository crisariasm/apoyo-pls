import Image from 'next/image'
import Link from 'next/link'

import { PortalShell } from './components/portal-shell'
import { dashboardRoleLabels, getModulesForRole } from '../../../lib/staff-portal-config'
import { requireStaffSession } from '../../../lib/staff-portal-auth'

export const dynamic = 'force-dynamic'

type QueryWhere = Record<string, unknown> | undefined

function andWhere(...conditions: QueryWhere[]): QueryWhere {
  const activeConditions = conditions.filter(Boolean) as Record<string, unknown>[]
  if (!activeConditions.length) return undefined
  if (activeConditions.length === 1) return activeConditions[0]
  return { and: activeConditions }
}

function dashboardVisibilityConditions(collection: string): Record<string, unknown>[] {
  if (collection === 'support-requests') return [{ status: { not_equals: 'cerrada' } }]
  if (collection === 'volunteer-activities') return [{ publicVisible: { equals: true } }, { status: { equals: 'abierta' } }]
  if (collection === 'needs') return [{ publicVisible: { equals: true } }, { status: { not_equals: 'cerrada' } }]
  if (['announcements', 'bulletins', 'community-notices', 'services', 'distribution-evidence'].includes(collection)) {
    return [{ publicVisible: { equals: true } }, { status: { not_equals: 'archivado' } }]
  }
  return [{ publicVisible: { equals: true } }]
}

export default async function StaffDashboard() {
  const session = await requireStaffSession()
  const modules = getModulesForRole(session.user.role)
  const snapshots = await Promise.all(modules.map(async (module) => {
    const count = async (where: QueryWhere) => {
      const result = await session.payload.find({
        collection: module.collection,
        depth: 0,
        limit: 1,
        page: 1,
        where: where as never,
        overrideAccess: true,
        user: session.user,
      })
      return result.totalDocs
    }

    const ownWhere = session.user.role === 'administracion'
      ? undefined
      : { registeredByUserId: { equals: session.user.id } }
    const publicConditions = dashboardVisibilityConditions(module.collection)
    const sharedTotalPromise = count(undefined)
    const ownTotalPromise = session.user.role === 'administracion' ? sharedTotalPromise : count(ownWhere)
    const visiblePromise = count(andWhere(ownWhere, ...publicConditions))
    const [sharedTotal, total, visible] = await Promise.all([sharedTotalPromise, ownTotalPromise, visiblePromise])
    return { slug: module.slug, total, visible, sharedTotal }
  }))
  const dashboardSnapshots = session.user.role === 'administracion' ? snapshots : snapshots.filter((item) => item.slug !== 'administracion')
  const totals = dashboardSnapshots.reduce((summary, item) => ({ total: summary.total + item.total, visible: summary.visible + item.visible }), { total: 0, visible: 0 })
  const chartCount = (snapshot: (typeof snapshots)[number] | undefined) => snapshot?.slug === 'evidencias' || snapshot?.slug === 'administracion' ? snapshot.sharedTotal : snapshot?.total || 0
  const maxCount = Math.max(...snapshots.map((item) => chartCount(item)), 1)
  const visiblePercent = totals.total ? Math.round((totals.visible / totals.total) * 100) : 0
  const unpublished = Math.max(totals.total - totals.visible, 0)

  return (
    <PortalShell name={session.user.name} userId={session.user.id} role={session.user.role} modules={modules} refreshDashboard>
      <section className="staff-welcome">
        <div>
          <p className="staff-eyebrow">Espacio de trabajo del equipo</p>
          <h1>Hola, {session.user.name.split(' ')[0]}.</h1>
          <p>Desde aquí puedes actualizar la información que la comunidad consulta y mantener al día la operación del centro.</p>
          <span className="staff-role-chip">{dashboardRoleLabels[session.user.role]}</span>
        </div>
        <Image src="/hero-PLs-al-llamado.png" alt="Equipo organizando ayudas en el centro de acopio" width={280} height={190} priority />
      </section>
      <section className="staff-section-heading">
        <div><p className="staff-eyebrow">Tus módulos</p><h2>Información para mantener al día</h2></div>
        <Link href="/" className="staff-back-link">Ver página pública</Link>
      </section>
      <section className="staff-kpi-grid" aria-label="Indicadores del portal">
        <article className="staff-kpi-card"><span>{session.user.role === 'administracion' ? 'Registros administrados' : 'Registros creados por ti'}</span><strong>{totals.total.toLocaleString('es-CO')}</strong><small>{session.user.role === 'administracion' ? 'Todos los módulos administrados' : 'Registros con tu identificador como creador'}</small></article>
        <article className="staff-kpi-card"><span>{session.user.role === 'administracion' ? 'Visibles o publicados' : 'Visibles de tus registros'}</span><strong>{totals.visible.toLocaleString('es-CO')}</strong><small>{session.user.role === 'administracion' ? 'Información disponible para la comunidad' : 'Información pública creada por ti'}</small></article>
      </section>
      <section className="staff-insights-grid">
        <article className="staff-insight-card"><div className="staff-card-heading"><div><p className="staff-eyebrow">Carga de trabajo</p><h2>Registros por módulo</h2></div></div><div className="staff-chart-list">{modules.map((module) => { const snapshot = snapshots.find((item) => item.slug === module.slug); const count = chartCount(snapshot); const width = `${Math.max(4, (count / maxCount) * 100)}%`; return <div className="staff-chart-row" key={module.slug}><div><span>{module.label}</span><strong>{count}</strong></div><i><b style={{ width }} /></i></div> })}</div></article>
          <article className="staff-insight-card staff-status-card"><div className="staff-card-heading"><div><p className="staff-eyebrow">Lectura rápida</p><h2>{session.user.role === 'administracion' ? 'Visibilidad de todos los registros' : 'Visibilidad de tus registros creados'}</h2></div></div><div className="staff-status-visual"><div className="staff-donut" style={{ background: `conic-gradient(#2e8060 0 ${visiblePercent}%, #d9e7df ${visiblePercent}% 100%)` }}><div><strong>{visiblePercent}%</strong><small>visibles</small></div></div><div className="staff-legend"><span><i /> Visibles {totals.visible}</span><span><i /> Aún no visibles {unpublished}</span></div></div><div className="staff-status-list"><div><span>Visibles o publicados</span><strong>{totals.visible}</strong></div><div><span>Aún no visibles</span><strong>{unpublished}</strong></div><div><span>{session.user.role === 'administracion' ? 'Registros administrados' : 'Registros creados por ti'}</span><strong>{totals.total}</strong></div></div><p>{session.user.role === 'administracion' ? 'Se cuentan todos los registros de los módulos administrados.' : 'Se cuentan solo los registros cuyo creador eres tú. Las listas de cada módulo siguen mostrando los registros compartidos del equipo.'}</p></article>
      </section>
      <section className="staff-module-grid" aria-label="Módulos disponibles">
        {modules.map((module) => <Link className="staff-module-card" href={`/equipo/${module.slug}`} key={module.slug}><span>{module.label}</span><strong>{snapshots.find((item) => item.slug === module.slug)?.sharedTotal || 0}</strong><small>{module.description}</small><em>{session.user.role === 'administracion' ? 'Todos los registros del módulo · Administrar →' : 'Registros compartidos del módulo · Administrar →'}</em></Link>)}
      </section>
    </PortalShell>
  )
}
