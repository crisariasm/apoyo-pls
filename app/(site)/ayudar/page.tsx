import Link from 'next/link'

import { HelpForm } from '../../components/help-form'
import { PageIntro } from '../../components/page-intro'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'

export default async function HelpPage() {
  const data = await getOverview()
  const activities = data.activities

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Quiero ayudar" title="Conecta tu ayuda con una necesidad real" description="Ofrece recursos, transporte o conocimientos. El equipo de PLs al llamado revisará tu propuesta y te contactará al teléfono que indiques." tone="green" />

      <section className="form-page page-section" id="formulario-ayuda">
        <div className="form-page-inner">
          <div className="form-page-copy">
            <div className="section-kicker green-text">Un solo punto para ayudar</div>
            <h2>Una oferta clara llega más rápido.</h2>
            <p>Antes de enviar, revisa las necesidades abiertas. Si lo que tienes no aparece allí, igual puedes contarnos: coordinación definirá el mejor uso.</p>
            <div className="form-steps"><div><strong>01</strong><span>Cuéntanos qué tienes.</span></div><div><strong>02</strong><span>El equipo revisa la prioridad.</span></div><div><strong>03</strong><span>Te contactamos para coordinar.</span></div></div>
            <Link className="text-button" href="/necesidades">Ver necesidades abiertas</Link>
          </div>
          <div className="form-page-form"><HelpForm /></div>
        </div>
      </section>

      <section className="activities-section page-section" aria-labelledby="activities-title">
        <div className="activities-inner">
          <div className="activities-heading"><div className="section-kicker green-text">Próximas actividades</div><h2 id="activities-title">También puedes ayudar con tu tiempo.</h2><p>Estas son las actividades abiertas en el centro. Para participar, elige “Ofrecer tiempo o conocimientos” en el formulario de arriba.</p></div>
          <div className={`activity-list-clean${activities.length > 6 ? ' is-scrollable' : ''}`}>{activities.map((activity) => <article className="activity-row" key={activity.id}><div className="activity-date"><strong>{String(activity.date).split(' ')[0]}</strong><small>{String(activity.date).includes('Mañana') ? 'AGO' : 'HOY'}</small></div><div><h3>{activity.title}</h3><p>{activity.time} · {activity.location}</p></div><strong className="activity-spots">{activity.spots}</strong></article>)}</div>
          {activities.length > 6 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más actividades.</p>}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
