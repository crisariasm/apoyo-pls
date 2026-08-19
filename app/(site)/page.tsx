import Image from 'next/image'

import { SiteFooter } from '../components/site-footer'
import { SiteHeader } from '../components/site-header'
import { NeedOfferModal } from '../components/need-offer-modal'
import { getOverview } from '../../lib/public-api'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const data = await getOverview()
  const announcements = data.announcements
  const needs = data.needs
  const metrics = data.metrics
  const center = data.center

  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="hero-section page-section">
        <div className="hero-copy">
          <div className="eyebrow">Red de apoyo comunitario en Pereira</div>
          <h1>Nuestro centro de acopio <em>PLs al llamado</em> — Pereira</h1>
          <p className="hero-lead">Estamos coordinando la recepción, organización y distribución de ayudas para las comunidades afectadas. Encuentra lo que tenemos, lo que hace falta y hacia dónde va la ayuda.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/ayudar#formulario-ayuda">Quiero ayudar</a>
            <a className="button button-ghost" href="/solicitar-apoyo#formulario-apoyo">Solicitar apoyo</a>
          </div>
          <div className="hero-meta">
            <div><strong>{center.address}</strong><small>Ubicación del centro</small></div>
            <div><strong>{center.hours}</strong><small>Horario de recepción</small></div>
          </div>
        </div>
        <div className="hero-art">
          <Image src="/hero-PLs-al-llamado.png" alt="Personas organizando donaciones en un centro de acopio de Pereira" fill priority sizes="(max-width: 900px) 100vw, 55vw" />
          <div className="hero-art-caption">Actualizado: {center.lastUpdate}</div>
        </div>
      </section>

      <section className="home-needs-section page-section" aria-labelledby="home-needs-title">
        <div className="section-heading light-heading"><div><div className="section-kicker peach-text">Necesidades de hoy</div><h2 id="home-needs-title">Esto es lo que hace falta llevar.</h2><p>Revisa esta lista antes de acercarte al centro.</p></div><a className="button button-light" href="/ayudar#formulario-ayuda">Quiero ayudar</a></div>
        <div className={`home-needs-list${needs.length > 8 ? ' is-scrollable' : ''}`}>
          {needs.map((need) => <article className={`home-need-row${need.featured ? ' is-featured' : ''}`} key={need.id}><div>{need.featured && <span className="featured-badge">Destacado</span>}<h3>{need.title}</h3><p>{need.detail}</p><small>{need.zone}</small></div><div className="home-need-actions"><strong>{need.quantity}</strong><NeedOfferModal title={need.title} zone={need.zone} quantity={need.quantity} /></div></article>)}
          {!needs.length && <p className="empty-state">Todavía no hay necesidades publicadas por el equipo.</p>}
        </div>
        {needs.length > 8 && <p className="collection-scroll-hint collection-scroll-hint-light">Desplázate dentro de la lista para consultar más necesidades.</p>}
      </section>

      <section className="home-help-section page-section" aria-labelledby="home-help-title">
        <div className="home-help-card">
          <div>
            <div className="section-kicker green-text">Ayudar</div>
            <h2 id="home-help-title">Conecta tu ayuda con una necesidad real.</h2>
            <p>Ofrece recursos, transporte o conocimientos. El equipo revisará tu propuesta y te contactará para coordinar.</p>
          </div>
          <div className="home-help-actions">
            <a className="button button-primary" href="/ayudar#formulario-ayuda">Quiero ayudar</a>
            <a className="text-button" href="/necesidades">Ver necesidades</a>
          </div>
        </div>
      </section>

      <section className="metrics-band page-section" aria-label="Resumen operativo">
        <div className="metric"><span>RECIBIDO</span><strong>{metrics.received}</strong><small>unidades registradas</small></div>
        <div className="metric"><span>DISPONIBLE</span><strong>{metrics.available}</strong><small>listas para entregar</small></div>
        <div className="metric"><span>DISTRIBUIDO</span><strong>{metrics.distributed}</strong><small>unidades entregadas</small></div>
        <div className="metric-note"><p>La información se actualiza desde el equipo operativo del centro.</p></div>
      </section>

      <section className="announcements-section page-section">
        <div className="section-heading"><div><div className="section-kicker orange-text">Al día</div><h2>Anuncios del centro</h2><p>Una vista breve de lo más importante para sumarte hoy.</p></div></div>
        <div className={`announcement-grid${announcements.length > 6 ? ' is-scrollable' : ''}`}>
          {announcements.map((announcement) => <article className={`announcement-card announcement-${announcement.tone || 'green'}${announcement.featured ? ' is-featured' : ''}`} key={announcement.id}>{announcement.featured && <span className="featured-badge">Destacado</span>}<span>{announcement.type}</span><h3>{announcement.title}</h3><small>{announcement.time}</small></article>)}
          {!announcements.length && <p className="empty-state">Todavía no hay anuncios publicados.</p>}
        </div>
        {announcements.length > 6 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más anuncios.</p>}
      </section>

      <SiteFooter />
    </main>
  )
}
