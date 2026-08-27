import { ServiceBrowser } from '../../components/service-browser'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Servicios comunitarios', 'Encuentra servicios gratuitos y oportunidades de trabajo ofrecidas por la comunidad.', '/servicios')

export default async function ServicesPage() {
  const data = await getOverview({ sections: ['services'] })
  const services = data.services
  const serviceAreas = new Set(services.map((service) => service.category.trim().toLocaleLowerCase('es-CO'))).size
  const freeServices = services.filter((service) => service.pricingType === 'gratis' || service.type === 'gratuito').length
  const cities = new Set(services.map((service) => service.city)).size

  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="services-hero page-section">
        <div className="services-hero-inner">
          <div className="services-hero-copy">
            <div className="services-hero-eyebrow"><span className="pulse-dot" />DIRECTORIO DE SERVICIOS · COLOMBIA</div>
            <h1>Trabajo, talento y apoyo <em>cerca de ti.</em></h1>
            <p>Encuentra personas, equipos y oficios que pueden ayudarte. También puedes ofrecer lo que sabes hacer para que llegue a quien lo necesita.</p>
            <div className="services-hero-actions"><a className="button button-primary" href="#directorio-servicios">Explorar servicios <span aria-hidden="true">↓</span></a><a className="button button-ghost" href="/ayudar#formulario-ayuda">Quiero ofrecer un servicio <span aria-hidden="true">↗</span></a></div>
            <div className="services-hero-stats" aria-label="Resumen del directorio">
              <div><strong>{serviceAreas}</strong><span>áreas de servicio</span></div>
              <div><strong>{freeServices}</strong><span>opciones gratuitas</span></div>
              <div><strong>{cities}</strong><span>ciudades y coberturas</span></div>
            </div>
          </div>
          <div className="services-hero-card">
            <div className="services-hero-card-top"><span className="section-kicker">La comunidad se mueve</span></div>
            <div className="services-hero-orbit" aria-hidden="true"><span className="orbit-line orbit-line-one" /><span className="orbit-line orbit-line-two" /><span className="orbit-dot orbit-dot-one"><svg viewBox="0 0 24 24"><path d="M14.7 4.2a4.1 4.1 0 0 0 5 5l-7.8 7.8a2.2 2.2 0 1 1-3.1-3.1l7.8-7.8a4.1 4.1 0 0 0-1.9-1.9ZM5.3 18.7l2 2" /></svg></span><span className="orbit-dot orbit-dot-two"><svg viewBox="0 0 24 24"><rect x="4.5" y="5" width="15" height="15" rx="2" /><path d="M8 5V4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 4v1M8 12l1.5 1.5L12 11M8 16h8" /></svg></span><span className="orbit-dot orbit-dot-three"><svg viewBox="0 0 24 24"><path d="M3.5 7.5h11v8h-11zM14.5 10h3l3 3v2.5h-6z" /><circle cx="7" cy="17" r="1.8" /><circle cx="17.5" cy="17" r="1.8" /></svg></span><strong>red<br />activa</strong></div>
            <p>Oficios, conocimientos y soluciones compartidas para conectar mejor a la comunidad.</p>
            <a href="#categorias-servicios">Ver categorías <span aria-hidden="true">↘</span></a>
          </div>
        </div>
      </section>
      <section className="services-how-it-works page-section">
        <div className="services-how-heading"><span className="section-kicker blue-text">Encontrar es más fácil</span><h2>Elige, compara y conecta.</h2></div>
        <div className="services-how-steps"><div><span>01</span><strong>Busca lo que necesitas</strong><p>Usa una categoría, ciudad o palabra clave.</p></div><div><span>02</span><strong>Mira la condición</strong><p>Identifica rápido si es gratis, de pago o negociable.</p></div><div><span>03</span><strong>Conecta directamente</strong><p>Escribe por WhatsApp o cuéntanos cómo ayudar.</p></div></div>
      </section>
      <section className="content-section page-section inner-page-section services-page-section" id="directorio-servicios">
        <div className="section-heading"><div><div className="section-kicker green-text">Directorio comunitario</div><h2>Una ayuda también puede ser un servicio.</h2><p>Filtra por categoría, ciudad o tarifa para encontrar una opción que sí te sirva.</p></div><span className="status-summary">{services.length} publicados</span></div>
        <div id="categorias-servicios"><ServiceBrowser services={services} /></div>
      </section>
      <section className="services-publish-band page-section"><div><span className="section-kicker orange-text">Para quienes ofrecen</span><h2>Tu trabajo también puede abrir una puerta.</h2><p>Comparte tu oficio, conocimiento o tiempo con una descripción clara, ciudad, modalidad y condición visible. Así las personas pueden encontrarte sin dar vueltas.</p></div><a className="button button-dark" href="/ayudar#formulario-ayuda">Quiero ofrecer mi ayuda <span aria-hidden="true">↗</span></a></section>
      <SiteFooter />
    </main>
  )
}
