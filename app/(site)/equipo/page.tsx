import Image from 'next/image'
import Link from 'next/link'

import { PortalShell } from './components/portal-shell'
import { LiveRefresh } from '../../components/live-refresh'
import { getModulesForRole } from '../../../lib/staff-portal-config'
import { dashboardRoleLabels } from '../../../lib/staff-portal-config'
import { requireStaffSession } from '../../../lib/staff-portal-auth'

export const dynamic = 'force-dynamic'

export default async function StaffDashboard() {
  const session = await requireStaffSession()
  const modules = getModulesForRole(session.user.role)
  const snapshots = await Promise.all(modules.map(async (module) => {
    const result = await session.payload.find({ collection: module.collection, pagination: false, sort: '-updatedAt', overrideAccess: true, user: session.user })
    const allRecords = result.docs as unknown as Array<Record<string, unknown>>
    const records = session.user.role === 'administracion'
      ? allRecords
      : allRecords.filter((record) => record.registeredByUserId === session.user.id)
    const visible = records.filter((record) => record.publicVisible !== false && record.status !== 'archivado' && record.status !== 'cerrada').length
    return { slug: module.slug, total: records.length, visible, sharedTotal: allRecords.length }
  }))
  const dashboardSnapshots = session.user.role === 'administracion' ? snapshots : snapshots.filter((item) => item.slug !== 'administracion')
  const totals = dashboardSnapshots.reduce((summary, item) => ({ total: summary.total + item.total, visible: summary.visible + item.visible }), { total: 0, visible: 0 })
  const chartCount = (snapshot: (typeof snapshots)[number] | undefined) => snapshot?.slug === 'evidencias' || snapshot?.slug === 'administracion' ? snapshot.sharedTotal : snapshot?.total || 0
  const maxCount = Math.max(...snapshots.map((item) => chartCount(item)), 1)
  const visiblePercent = totals.total ? Math.round((totals.visible / totals.total) * 100) : 0
  const unpublished = Math.max(totals.total - totals.visible, 0)

  return (
    <PortalShell name={session.user.name} role={session.user.role} modules={modules}>
      <LiveRefresh includeDashboard />
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
        <article className="staff-kpi-card"><span>Registros bajo tu cuidado</span><strong>{totals.total.toLocaleString('es-CO')}</strong><small>{session.user.role === 'administracion' ? 'Todos los módulos administrados' : 'Creados por tu usuario'}</small></article>
        <article className="staff-kpi-card"><span>Visibles o publicados</span><strong>{totals.visible.toLocaleString('es-CO')}</strong><small>Información disponible para la comunidad</small></article>
      </section>
      <section className="staff-insights-grid">
        <article className="staff-insight-card"><div className="staff-card-heading"><div><p className="staff-eyebrow">Carga de trabajo</p><h2>Registros por módulo</h2></div></div><div className="staff-chart-list">{modules.map((module) => { const snapshot = snapshots.find((item) => item.slug === module.slug); const count = chartCount(snapshot); const width = `${Math.max(4, (count / maxCount) * 100)}%`; return <div className="staff-chart-row" key={module.slug}><div><span>{module.label}</span><strong>{count}</strong></div><i><b style={{ width }} /></i></div> })}</div></article>
        <article className="staff-insight-card staff-status-card"><div className="staff-card-heading"><div><p className="staff-eyebrow">Lectura rápida</p><h2>Visibilidad de tus registros</h2></div></div><div className="staff-status-visual"><div className="staff-donut" style={{ background: `conic-gradient(#2e8060 0 ${visiblePercent}%, #d9e7df ${visiblePercent}% 100%)` }}><div><strong>{visiblePercent}%</strong><small>visibles</small></div></div><div className="staff-legend"><span><i /> Visibles {totals.visible}</span><span><i /> Aún no visibles {unpublished}</span></div></div><div className="staff-status-list"><div><span>Visibles o publicados</span><strong>{totals.visible}</strong></div><div><span>Aún no visibles</span><strong>{unpublished}</strong></div><div><span>Registros propios</span><strong>{totals.total}</strong></div></div><p>Solo se cuentan registros creados por tu usuario. La información se actualiza al volver a cargar el dashboard.</p></article>
      </section>
      <section className="staff-module-grid" aria-label="Módulos disponibles">
        {modules.map((module) => <Link className="staff-module-card" href={`/equipo/${module.slug}`} key={module.slug}><span>{module.label}</span><strong>{snapshots.find((item) => item.slug === module.slug)?.sharedTotal || 0}</strong><small>{module.description}</small><em>Administrar información →</em></Link>)}
      </section>
    </PortalShell>
  )
}
