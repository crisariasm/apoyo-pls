import { PageIntro } from '../../components/page-intro'
import { ServiceBrowser } from '../../components/service-browser'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Servicios comunitarios', 'Explora servicios gratuitos, ofrecidos por la comunidad y apoyos que todavía se necesitan.', '/servicios')

export default async function ServicesPage() {
  const data = await getOverview({ sections: ['services'] })
  const services = data.services

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Capacidades de la comunidad" title="Servicios" description="Encuentra apoyos gratuitos, servicios que la comunidad ofrece y capacidades que todavía hacen falta para responder mejor." tone="green" />
      <section className="content-section page-section inner-page-section services-page-section">
        <div className="section-heading"><div><div className="section-kicker green-text">Directorio comunitario</div><h2>Una ayuda también puede ser un servicio.</h2><p>Busca por categoría o escribe lo que necesitas encontrar.</p></div><span className="status-summary">{services.length} servicios</span></div>
        <ServiceBrowser services={services} />
      </section>
      <section className="info-band page-section"><div><span className="section-kicker blue-text">Criterio de publicación</span><h2>Claro, útil y verificable.</h2><p>Los servicios se publican con una condición visible: gratuito, ofrecido por la comunidad o se necesita. El equipo puede actualizar o retirar un aviso cuando cambie.</p></div></section>
      <SiteFooter />
    </main>
  )
}
