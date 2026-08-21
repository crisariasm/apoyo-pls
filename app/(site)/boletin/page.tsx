import { BulletinList } from '../../components/bulletin-list'
import { PageIntro } from '../../components/page-intro'
import { SiteFooter } from '../../components/site-footer'
import { SiteHeader } from '../../components/site-header'
import { getOverview } from '../../../lib/public-api'
import { pageMetadata } from '../../../lib/site-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata('Boletín', 'Consulta avances, registros y aprendizajes del centro de acopio.', '/boletin')

export default async function BulletinPage() {
  const data = await getOverview({ sections: ['bulletins'] })
  const bulletins = data.bulletins

  return (
    <main className="site-shell">
      <SiteHeader />
      <PageIntro eyebrow="Memoria de la operación" title="Boletín" description="Avances, registros y aprendizajes del centro de acopio para entender cómo se está moviendo la ayuda." tone="blue" />
      <section className="content-section page-section inner-page-section bulletin-page-section">
        <div className="section-heading"><div><div className="section-kicker blue-text">Actualizaciones del equipo</div><h2>Lo que hemos aprendido en el camino.</h2><p>Abre cada tarjeta para leer el contenido completo sin perder de vista la lista.</p></div><span className="status-summary">{bulletins.length} boletines</span></div>
        <BulletinList bulletins={bulletins} />
      </section>
      <section className="info-band page-section"><div><span className="section-kicker green-text">Información pública</span><h2>Un registro que se puede consultar.</h2><p>Los boletines cuentan avances generales y decisiones operativas sin exponer datos personales ni ubicaciones sensibles.</p></div></section>
      <SiteFooter />
    </main>
  )
}
