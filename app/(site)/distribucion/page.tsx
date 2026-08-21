import { EvidenceCarousel } from '../../components/evidence-carousel'
import { PageIntro } from '../../components/page-intro'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Distribución y evidencias', 'Consulta las salidas de ayuda y el registro visual de la operación comunitaria.', '/distribucion')

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(' ', '-')
}

export default async function DistributionPage() {
  const data = await getOverview({ sections: ['distributions', 'evidences'] })
  const distributions = data.distributions
  const evidence = data.evidences.map((entry) => ({ ...entry, title: `${entry.source} · ${entry.title}` }))
  const delivered = distributions.filter((item) => item.status === 'Entregado').length
  const inRoute = distributions.filter((item) => item.status === 'En ruta').length
  const pending = distributions.filter((item) => item.status === 'Pendiente').length

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Seguimiento" title="La ayuda sigue su camino" description="Consulta salidas registradas por destino general. Trabajamos con zonas, barrios, albergues y organizaciones para proteger la privacidad de las personas." tone="blue" />
      <section className="distribution-section page-section inner-page-section">
        <div className="section-heading"><div><div className="section-kicker blue-text">Salidas registradas</div><h2>Distribución de ayudas</h2><p>Un resumen público de los recursos que ya salieron o están por salir.</p></div><span className="date-chip">Registros actuales</span></div>
        <div className="distribution-layout"><div className="route-card"><div className="route-map"><div className="route-map-title">Estado de las rutas</div><div className="route-journey"><div><strong>Centro PLs al llamado</strong><small>Pereira</small></div><div className="journey-line" /><div><strong>Comunidades</strong><small>Destinos generales</small></div></div><div className="map-legend"><span>{delivered} entregadas</span><span>{inRoute} en ruta</span><span>{pending} pendientes</span></div></div><div className="route-copy"><span className="route-label">Rutas registradas</span><strong>{distributions.length}</strong><p>Salidas coordinadas por PLs al llamado y aliados comunitarios.</p></div></div><div className={`distribution-list${distributions.length > 8 ? ' is-scrollable' : ''}`}>{distributions.map((item) => <article className="distribution-item" key={item.id}><div><div className="distribution-head"><strong>{item.resource}</strong><span>{item.date}</span></div><p>{item.quantity} · {item.destination}</p><small>{item.organization}</small></div><span className={`status-text status-text-${statusClass(item.status)}`}>{item.status}</span></article>)}{!distributions.length && <p className="empty-state">Todavía no hay salidas registradas.</p>}</div></div>
        {distributions.length > 8 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más salidas.</p>}
      </section>
      <section className="distribution-evidence-section page-section">
        <div className="section-heading"><div><div className="section-kicker green-text">Registro visual</div><h2>Evidencias de las salidas.</h2><p>Imágenes generales de preparación y entrega, sin datos sensibles.</p></div><span className="status-summary">{evidence.length} registros</span></div>
        {evidence.length > 0 ? <EvidenceCarousel evidence={evidence} /> : <p className="empty-state">Todavía no hay evidencias publicadas por el equipo de distribución.</p>}
      </section>
      <section className="content-section page-section inner-page-section"><div className="privacy-note"><div><strong>Transparencia con cuidado</strong><p>No publicamos nombres de familias, menores, teléfonos ni ubicaciones sensibles. El detalle operativo queda disponible para el equipo autorizado.</p></div></div></section>
      <SiteFooter />
    </main>
  )
}
