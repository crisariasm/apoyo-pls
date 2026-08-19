import { PageIntro } from '../../components/page-intro'
import { NeedOfferModal } from '../../components/need-offer-modal'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Qué necesitamos', 'Revisa las necesidades abiertas del centro antes de llevar una ayuda.', '/necesidades')

export default async function NeedsPage() {
  const data = await getOverview({ sections: ['needs'] })
  const needs = data.needs

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Prioridades abiertas" title="Qué necesitamos" description="Revisa las prioridades antes de donar. Así la ayuda llega completa, se clasifica más rápido y responde a una necesidad real." tone="green" />
      <section className="needs-section page-section inner-page-section">
        <div className="section-heading light-heading"><div><div className="section-kicker peach-text">Necesidades del centro</div><h2>Ayudas que pueden mover la operación.</h2><p>Las cantidades son aproximadas y pueden cambiar durante la jornada.</p></div><a className="button button-light" href="/ayudar#formulario-ayuda">Tengo algo para ofrecer</a></div>
        <div className={`needs-grid${needs.length > 8 ? ' is-scrollable' : ''}`}>{needs.map((need) => <article className={`need-card${need.featured ? ' is-featured' : ''}`} key={need.id}><div className="need-card-top"><span className={`priority priority-${String(need.priority).toLowerCase()}`}>{need.priority}</span><span className="need-category">{need.category}</span></div>{need.featured && <span className="featured-badge">Destacado</span>}<h3>{need.title}</h3><p>{need.detail}</p><div className="need-footer"><strong>{need.quantity}</strong><span>{need.zone}</span></div><NeedOfferModal title={need.title} zone={need.zone} quantity={need.quantity} /></article>)}{!needs.length && <p className="empty-state">Todavía no hay necesidades publicadas por el equipo.</p>}</div>
        {needs.length > 8 && <p className="collection-scroll-hint collection-scroll-hint-light">Desplázate dentro de la lista para consultar más necesidades.</p>}
      </section>
      <section className="content-section page-section inner-page-section"><div className="info-callout"><div><h3>¿No encuentras lo que tienes?</h3><p>El equipo puede revisar ofertas de otros recursos, transporte o conocimientos. Cuéntanos qué puedes aportar y te responderemos.</p></div><a className="text-button" href="/ayudar#formulario-ayuda">Enviar oferta</a></div></section>
      <SiteFooter />
    </main>
  )
}
