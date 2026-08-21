import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps, CollectionSlug, Payload, Where } from 'payload'

import { auditActionValues, auditSourceValues, type AuditAction, type AuditSource } from '../../lib/audit-log'
import { headR2Object, isR2Enabled } from '../../lib/r2-storage'

const MONITORING_PATH = '/admin/monitoring'
const LOG_PAGE_SIZE = 25
const ACTIVITY_SAMPLE_LIMIT = 1000

const actionLabels: Record<AuditAction, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  error: 'Error',
}

const sourceLabels: Record<AuditSource, string> = {
  'payload-admin': 'Payload',
  equipo: 'Panel de equipo',
  sistema: 'Sistema',
}

const entityLabels: Record<string, string> = {
  'aid-intakes': 'Ayudas recibidas',
  announcements: 'Anuncios',
  authentication: 'Autenticación',
  bulletins: 'Boletines',
  'community-notices': 'Comunicados',
  distributions: 'Distribución',
  'distribution-evidence': 'Evidencias',
  media: 'Archivos',
  needs: 'Necesidades',
  payload: 'Payload',
  resources: 'Recursos',
  services: 'Servicios',
  'site-settings': 'Configuración del centro',
  'support-requests': 'Solicitudes',
  users: 'Usuarios',
  'volunteer-activities': 'Actividades',
}

const countDefinitions: Array<{ label: string; slug: CollectionSlug }> = [
  { label: 'Recursos', slug: 'resources' },
  { label: 'Ayudas recibidas', slug: 'aid-intakes' },
  { label: 'Necesidades', slug: 'needs' },
  { label: 'Distribuciones', slug: 'distributions' },
  { label: 'Evidencias', slug: 'distribution-evidence' },
  { label: 'Anuncios', slug: 'announcements' },
  { label: 'Boletines', slug: 'bulletins' },
  { label: 'Servicios', slug: 'services' },
  { label: 'Comunicados', slug: 'community-notices' },
  { label: 'Solicitudes', slug: 'support-requests' },
  { label: 'Usuarios', slug: 'users' },
  { label: 'Archivos', slug: 'media' },
]

type AuditRecord = {
  action?: unknown
  actorEmail?: unknown
  actorId?: unknown
  actorName?: unknown
  actorRole?: unknown
  changedFields?: unknown
  documentId?: unknown
  documentLabel?: unknown
  entitySlug?: unknown
  errorName?: unknown
  id?: unknown
  ipAddress?: unknown
  occurredAt?: unknown
  source?: unknown
  statusCode?: unknown
  success?: unknown
  summary?: unknown
}

type ServiceCheck = {
  detail: string
  latency?: number
  state: 'healthy' | 'warning' | 'error'
  title: string
}

function canMonitor(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const role = (value as { role?: unknown }).role
  return role === 'admin' || role === 'super-admin'
}

function stringValue(value: unknown, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function positivePage(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1
}

function validAction(value: string): value is AuditAction {
  return auditActionValues.includes(value as AuditAction)
}

function validSource(value: string): value is AuditSource {
  return auditSourceValues.includes(value as AuditSource)
}

function formatDate(value: unknown, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
    ...options,
  }).format(date)
}

function dayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Bogota',
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function shortDayLabel(date: Date) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(date).replace('.', '')
}

function actionValue(value: unknown): AuditAction {
  const candidate = stringValue(value, 20)
  return validAction(candidate) ? candidate : 'update'
}

function sourceValue(value: unknown): AuditSource {
  const candidate = stringValue(value, 30)
  return validSource(candidate) ? candidate : 'sistema'
}

function statusClass(state: ServiceCheck['state']) {
  return `pls-health-card pls-health-card--${state}`
}

async function databaseCheck(payload: Payload): Promise<ServiceCheck> {
  const startedAt = Date.now()
  try {
    await payload.count({ collection: 'users', overrideAccess: true })
    return { title: 'Base de datos', state: 'healthy', detail: 'PostgreSQL responde correctamente.', latency: Date.now() - startedAt }
  } catch {
    return { title: 'Base de datos', state: 'error', detail: 'No fue posible consultar PostgreSQL.', latency: Date.now() - startedAt }
  }
}

async function r2Check(payload: Payload): Promise<ServiceCheck> {
  if (!isR2Enabled()) return { title: 'Almacenamiento R2', state: 'warning', detail: 'R2 no está habilitado en este entorno.' }

  const startedAt = Date.now()
  try {
    const mediaResult = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      sort: '-createdAt',
      where: { r2Key: { exists: true } },
      select: { r2Key: true },
    })
    const key = stringValue((mediaResult.docs[0] as { r2Key?: unknown } | undefined)?.r2Key, 512)
    if (!key) return { title: 'Almacenamiento R2', state: 'warning', detail: 'R2 está configurado, pero aún no hay un archivo para comprobar.', latency: Date.now() - startedAt }
    const response = await headR2Object(key)
    return response.ok
      ? { title: 'Almacenamiento R2', state: 'healthy', detail: 'El bucket y el archivo de prueba responden correctamente.', latency: Date.now() - startedAt }
      : { title: 'Almacenamiento R2', state: 'error', detail: `R2 respondió con estado ${response.status}.`, latency: Date.now() - startedAt }
  } catch {
    return { title: 'Almacenamiento R2', state: 'error', detail: 'No fue posible comprobar la conexión con R2.', latency: Date.now() - startedAt }
  }
}

function pageURL(searchParams: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams()
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (key === 'page') continue
    const value = firstParam(rawValue)
    if (value) query.set(key, value)
  }
  if (page > 1) query.set('page', String(page))
  const suffix = query.toString()
  return suffix ? `${MONITORING_PATH}?${suffix}` : MONITORING_PATH
}

export async function MonitoringView(props: AdminViewServerProps) {
  const { initPageResult, searchParams = {} } = props
  const { locale, permissions, req, visibleEntities: authenticatedEntities } = initPageResult
  const { payload } = req
  if (!canMonitor(req.user)) redirect('/admin')

  // Payload mantiene estas listas dentro de un proveedor cliente. En React 19
  // deben entregarse como un objeto nuevo para conservar el menú nativo al
  // navegar hacia una vista personalizada.
  const visibleEntities = {
    collections: [...(authenticatedEntities?.collections || [])],
    globals: [...(authenticatedEntities?.globals || [])],
  }

  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const search = stringValue(firstParam(searchParams.search), 120)
  const selectedAction = firstParam(searchParams.action)
  const selectedSource = firstParam(searchParams.source)
  const selectedEntity = stringValue(firstParam(searchParams.entity), 120)
  const selectedPeriod = ['24h', '7d', '30d', 'all'].includes(firstParam(searchParams.period)) ? firstParam(searchParams.period) : '7d'
  const page = positivePage(firstParam(searchParams.page))

  const filters: Where[] = []
  if (validAction(selectedAction)) filters.push({ action: { equals: selectedAction } })
  if (validSource(selectedSource)) filters.push({ source: { equals: selectedSource } })
  if (selectedEntity && Object.prototype.hasOwnProperty.call(entityLabels, selectedEntity)) filters.push({ entitySlug: { equals: selectedEntity } })
  if (search) {
    filters.push({
      or: [
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { documentLabel: { contains: search } },
        { summary: { contains: search } },
      ],
    })
  }
  if (selectedPeriod !== 'all') {
    const hours = selectedPeriod === '24h' ? 24 : selectedPeriod === '30d' ? 24 * 30 : 24 * 7
    filters.push({ occurredAt: { greater_than_equal: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString() } })
  }
  const logWhere: Where | undefined = filters.length ? { and: filters } : undefined

  const [database, r2, logs, activity24, activeUsers24, errors24, pendingRequests, activitySample, recordCounts] = await Promise.all([
    databaseCheck(payload),
    r2Check(payload),
    payload.find({ collection: 'audit-logs', depth: 0, limit: LOG_PAGE_SIZE, page, sort: '-occurredAt', where: logWhere, overrideAccess: true }),
    payload.count({ collection: 'audit-logs', where: { occurredAt: { greater_than_equal: last24Hours.toISOString() } }, overrideAccess: true }),
    payload.findDistinct({ collection: 'audit-logs', field: 'actorId', where: { occurredAt: { greater_than_equal: last24Hours.toISOString() } }, overrideAccess: true }),
    payload.count({ collection: 'audit-logs', where: { and: [{ action: { equals: 'error' } }, { occurredAt: { greater_than_equal: last24Hours.toISOString() } }] }, overrideAccess: true }),
    payload.count({ collection: 'support-requests', where: { status: { equals: 'pendiente' } }, overrideAccess: true }),
    payload.find({ collection: 'audit-logs', depth: 0, limit: ACTIVITY_SAMPLE_LIMIT, pagination: false, sort: '-occurredAt', where: { occurredAt: { greater_than_equal: last7Days.toISOString() } }, overrideAccess: true }),
    Promise.all(countDefinitions.map(async ({ label, slug }) => ({ label, total: (await payload.count({ collection: slug, overrideAccess: true })).totalDocs }))),
  ])

  const activityRecords = activitySample.docs as unknown as AuditRecord[]
  const dayCounts = new Map<string, number>()
  for (const record of activityRecords) {
    const date = new Date(String(record.occurredAt || ''))
    if (!Number.isNaN(date.getTime())) dayCounts.set(dayKey(date), (dayCounts.get(dayKey(date)) || 0) + 1)
  }
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000)
    return { count: dayCounts.get(dayKey(date)) || 0, label: shortDayLabel(date) }
  })
  const chartMax = Math.max(1, ...chartDays.map((day) => day.count))
  const checks: ServiceCheck[] = [
    { title: 'Aplicación', state: 'healthy', detail: 'El administrador y el servidor están operativos.' },
    database,
    r2,
  ]
  const totalPages = Math.max(logs.totalPages || 1, 1)
  const currentPage = Math.min(logs.page || page, totalPages)

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={props.params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user || undefined}
      viewActions={props.viewActions}
      visibleEntities={visibleEntities}
    >
    <main className="pls-monitoring">
      <header className="pls-monitoring__header">
        <div>
          <p className="pls-monitoring__eyebrow">Control del sistema</p>
          <h1>Monitoreo y auditoría</h1>
          <p>Estado técnico, volumen de información y trazabilidad de las acciones realizadas por usuarios autenticados.</p>
        </div>
        <div className="pls-monitoring__header-actions">
          <span>Comprobado {formatDate(now)}</span>
          <a className="pls-monitoring__refresh" href={MONITORING_PATH}>Actualizar estado</a>
        </div>
      </header>

      <section className="pls-health-grid" aria-label="Estado de servicios">
        {checks.map((check) => (
          <article className={statusClass(check.state)} key={check.title}>
            <div className="pls-health-card__heading">
              <span className="pls-health-card__status" aria-hidden="true" />
              <span>{check.state === 'healthy' ? 'Operativo' : check.state === 'warning' ? 'Revisar' : 'Con incidencia'}</span>
            </div>
            <h2>{check.title}</h2>
            <p>{check.detail}</p>
            {typeof check.latency === 'number' && <small>Respuesta: {check.latency} ms</small>}
          </article>
        ))}
      </section>

      <section className="pls-monitor-kpis" aria-label="Indicadores de actividad">
        <article><span>Actividad en 24 horas</span><strong>{activity24.totalDocs.toLocaleString('es-CO')}</strong><small>Acciones auditadas</small></article>
        <article><span>Usuarios activos</span><strong>{activeUsers24.totalDocs.toLocaleString('es-CO')}</strong><small>Con actividad en 24 horas</small></article>
        <article className={pendingRequests.totalDocs ? 'pls-monitor-kpi--attention' : ''}><span>Solicitudes pendientes</span><strong>{pendingRequests.totalDocs.toLocaleString('es-CO')}</strong><small>Esperando revisión</small></article>
        <article className={errors24.totalDocs ? 'pls-monitor-kpi--danger' : ''}><span>Errores registrados</span><strong>{errors24.totalDocs.toLocaleString('es-CO')}</strong><small>Durante las últimas 24 horas</small></article>
      </section>

      <div className="pls-monitoring__split">
        <section className="pls-monitor-panel">
          <div className="pls-monitor-panel__heading">
            <div><p className="pls-monitoring__eyebrow">Últimos siete días</p><h2>Ritmo de actividad</h2></div>
            <span>Hasta {ACTIVITY_SAMPLE_LIMIT.toLocaleString('es-CO')} eventos recientes</span>
          </div>
          <div className="pls-activity-chart" role="img" aria-label="Actividad auditada de los últimos siete días">
            {chartDays.map((day) => (
              <div className="pls-activity-chart__day" key={day.label}>
                <span>{day.count}</span>
                <div><i style={{ height: `${Math.max(day.count ? 12 : 3, Math.round((day.count / chartMax) * 100))}%` }} /></div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="pls-monitor-panel">
          <div className="pls-monitor-panel__heading"><div><p className="pls-monitoring__eyebrow">Base de datos</p><h2>Registros por módulo</h2></div></div>
          <div className="pls-record-counts">
            {recordCounts.map((record) => <div key={record.label}><span>{record.label}</span><strong>{record.total.toLocaleString('es-CO')}</strong></div>)}
          </div>
        </section>
      </div>

      <section className="pls-monitor-panel pls-audit-panel">
        <div className="pls-monitor-panel__heading pls-audit-panel__heading">
          <div>
            <p className="pls-monitoring__eyebrow">Trazabilidad</p>
            <h2>Actividad de usuarios</h2>
            <p>Se registran accesos, cambios, eliminaciones y errores. Los valores sensibles y el contenido completo de los formularios no se almacenan.</p>
          </div>
          <Link href="/admin/collections/audit-logs">Abrir historial completo</Link>
        </div>

        <form className="pls-audit-filters" action={MONITORING_PATH} method="GET">
          <label><span>Buscar</span><input type="search" name="search" defaultValue={search} maxLength={120} placeholder="Usuario, correo o registro" /></label>
          <label><span>Acción</span><select name="action" defaultValue={validAction(selectedAction) ? selectedAction : ''}><option value="">Todas</option>{auditActionValues.map((action) => <option key={action} value={action}>{actionLabels[action]}</option>)}</select></label>
          <label><span>Origen</span><select name="source" defaultValue={validSource(selectedSource) ? selectedSource : ''}><option value="">Todos</option>{auditSourceValues.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}</select></label>
          <label><span>Módulo</span><select name="entity" defaultValue={Object.prototype.hasOwnProperty.call(entityLabels, selectedEntity) ? selectedEntity : ''}><option value="">Todos</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Periodo</span><select name="period" defaultValue={selectedPeriod}><option value="24h">24 horas</option><option value="7d">7 días</option><option value="30d">30 días</option><option value="all">Todo</option></select></label>
          <div className="pls-audit-filters__actions"><button type="submit">Aplicar filtros</button><a href={MONITORING_PATH}>Limpiar</a></div>
        </form>

        <div className="pls-audit-summary">
          <strong>{logs.totalDocs.toLocaleString('es-CO')} eventos encontrados</strong>
          <span>Página {currentPage} de {totalPages}</span>
        </div>

        <div className="pls-audit-list">
          {(logs.docs as unknown as AuditRecord[]).map((record) => {
            const action = actionValue(record.action)
            const source = sourceValue(record.source)
            const recordId = stringValue(record.id, 80)
            return (
              <article className="pls-audit-row" key={recordId}>
                <div className="pls-audit-row__time"><strong>{formatDate(record.occurredAt)}</strong><span>{sourceLabels[source]}</span></div>
                <div className="pls-audit-row__main">
                  <div className="pls-audit-row__title"><span className={`pls-action-pill pls-action-pill--${action}`}>{actionLabels[action]}</span><strong>{stringValue(record.actorName, 160) || 'Usuario autenticado'}</strong><small>{stringValue(record.actorRole, 80)}</small></div>
                  <p>{stringValue(record.summary, 1000)}</p>
                  <div className="pls-audit-row__meta">
                    <span>Módulo: {entityLabels[stringValue(record.entitySlug, 120)] || stringValue(record.entitySlug, 120)}</span>
                    {stringValue(record.documentLabel, 200) && <span>Registro: {stringValue(record.documentLabel, 200)}</span>}
                    {stringValue(record.changedFields, 2000) && <span>Campos: {stringValue(record.changedFields, 2000)}</span>}
                    {record.success === false && <span className="pls-audit-row__error">{stringValue(record.errorName, 120) || 'Error'}{typeof record.statusCode === 'number' ? ` · ${record.statusCode}` : ''}</span>}
                  </div>
                </div>
                {recordId && <a className="pls-audit-row__detail" href={`/admin/collections/audit-logs/${encodeURIComponent(recordId)}`}>Ver detalle</a>}
              </article>
            )
          })}
          {!logs.docs.length && <div className="pls-audit-empty"><strong>No hay actividad para estos filtros.</strong><span>Prueba con otro periodo o limpia la búsqueda.</span></div>}
        </div>

        {totalPages > 1 && (
          <nav className="pls-audit-pagination" aria-label="Paginación del historial">
            <a aria-disabled={currentPage <= 1} href={currentPage > 1 ? pageURL(searchParams, currentPage - 1) : undefined}>Anterior</a>
            <span>{currentPage} / {totalPages}</span>
            <a aria-disabled={currentPage >= totalPages} href={currentPage < totalPages ? pageURL(searchParams, currentPage + 1) : undefined}>Siguiente</a>
          </nav>
        )}
      </section>
    </main>
    </DefaultTemplate>
  )
}
