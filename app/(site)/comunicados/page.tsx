import { CommunityNoticeGrid } from '../../components/community-notice-grid'
import { PageIntro } from '../../components/page-intro'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Comunicados comunitarios', 'Encuentra avisos útiles de la comunidad sobre animales, vivienda, objetos e información general.', '/comunicados')

export default async function CommunityNoticesPage() {
  const data = await getOverview({ sections: ['communityNotices'] })
  const notices = data.communityNotices

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Red comunitaria" title="Comunicados" description="Comparte información útil de la comunidad: animales encontrados, vivienda, objetos y avisos de interés general." tone="blue" />
      <section className="content-section page-section inner-page-section notice-page-section">
        <div className="section-heading"><div><div className="section-kicker blue-text">Información para compartir</div><h2>Avisos que pueden ayudar a encontrar.</h2><p>Los comunicados se revisan antes de publicarse y trabajan con zonas generales para cuidar los datos.</p></div><span className="status-summary">{notices.length} comunicados</span></div>
        <CommunityNoticeGrid notices={notices} />
      </section>
      <section className="info-band page-section"><div><span className="section-kicker green-text">Antes de publicar</span><h2>Comparte solo lo necesario.</h2><p>También puedes compartir referencias de vivienda, como casas en arriendo, siempre con zona general y condiciones por confirmar. No incluyas documentos, teléfonos personales ni datos de menores.</p></div></section>
      <SiteFooter />
    </main>
  )
}
