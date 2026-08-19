import Link from 'next/link'

import { PageIntro } from '../../components/page-intro'
import { ResourceBrowser } from '../../components/resource-browser'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Qué tenemos hoy', 'Consulta los recursos disponibles y las ayudas recibidas en el centro de acopio.', '/recursos')

export default async function ResourcesPage() {
  const data = await getOverview({ sections: ['resources', 'aidIntakes'] })
  const resources = data.resources
  const aidIntakes = data.aidIntakes
  const center = data.center

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Inventario público" title="Qué tenemos hoy" description="Consulta existencias aproximadas antes de donar o solicitar apoyo. El equipo de inventario actualiza esta información desde el centro de acopio." tone="green" />
      <section className="content-section page-section inner-page-section">
        <div className="section-heading"><div><div className="section-kicker green-text">Centro de acopio PLs al llamado, Pereira</div><h2>Recursos disponibles</h2><p>Última actualización: {center.lastUpdate}</p></div><div className="status-summary">Estado: {center.status === 'abierto' ? 'abierto' : center.status}</div></div>
        <ResourceBrowser resources={resources} />
      </section>
      <section className="received-aids-section page-section" aria-labelledby="received-aids-title">
        <div className="section-heading"><div><div className="section-kicker peach-text">Recepción del centro</div><h2 id="received-aids-title">Ayudas recibidas</h2><p>Registro público de aportes que ya llegaron al centro y están en proceso de organización.</p></div></div>
        <div className={`received-aids-grid${aidIntakes.length > 6 ? ' is-scrollable' : ''}`}>
          {aidIntakes.map((intake) => <article className={`received-aid-card${intake.featured ? ' is-featured' : ''}`} key={intake.id}><div className="received-aid-top"><span>{intake.category}</span><small>{intake.receivedAt}</small></div>{intake.featured && <span className="featured-badge">Destacado</span>}<h3>{intake.resource}</h3><strong>{intake.quantity}</strong><p>{intake.sourceType} · {intake.status}</p></article>)}
        </div>
        {aidIntakes.length > 6 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más recepciones.</p>}
      </section>
      <section className="info-band page-section"><div><span className="section-kicker blue-text">Antes de donar</span><h2>Prioriza lo que sí está haciendo falta.</h2><p>Si quieres ofrecer algo que no aparece en el inventario, revisa las necesidades urgentes o envía una oferta al equipo.</p></div><Link className="button button-primary" href="/necesidades">Ver necesidades</Link></section>
      <SiteFooter />
    </main>
  )
}
