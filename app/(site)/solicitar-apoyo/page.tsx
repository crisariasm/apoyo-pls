import Link from 'next/link'

import { PageIntro } from '../../components/page-intro'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { SupportForm } from '../../components/support-form'

export default function RequestSupportPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Solicitar apoyo" title="Cuéntanos qué hace falta" description="Registra una necesidad general para que el equipo de PLs al llamado pueda revisarla, priorizarla y coordinar una respuesta." tone="green" />
      <section className="form-page page-section" id="formulario-apoyo">
        <div className="form-page-inner">
          <div className="form-page-copy">
            <div className="section-kicker green-text">Trabajamos por zonas</div>
            <h2>La información justa para responder mejor.</h2>
            <p>Indica zona, categoría, cantidad aproximada y el momento en que se necesita. No pedimos nombres de familias, datos de niños ni información sensible.</p>
            <div className="privacy-note">
              <div>
                <strong>Privacidad primero</strong>
                <p>El detalle queda disponible para el equipo autorizado; públicamente solo mostramos necesidades agregadas.</p>
              </div>
            </div>
            <Link className="text-button" href="/distribucion">Ver ayudas distribuidas</Link>
          </div>
          <div className="form-page-form"><SupportForm /></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
