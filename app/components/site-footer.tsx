import Image from 'next/image'
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Image className="brand-logo" src="/logo-PLs-rosado.png" alt="PLs al llamado" width={52} height={52} />
          <div><strong>PLs al llamado</strong><small>Centro de acopio · Red de apoyo</small></div>
        </div>
        <p className="footer-description">Información clara para saber qué hace falta, cómo ayudar y hacia dónde llegan las ayudas.</p>
        <div className="footer-column">
          <span className="footer-column-title">Secciones</span>
          <nav className="footer-links" aria-label="Enlaces del sitio">
            <Link href="/">Inicio</Link>
            <Link href="/recursos">Qué tenemos</Link>
            <Link href="/necesidades">Qué necesitamos</Link>
            <Link href="/distribucion">Distribución</Link>
            <Link href="/comunicados">Comunicados</Link>
            <Link href="/servicios">Servicios</Link>
            <Link href="/boletin">Boletín</Link>
            <Link href="/ayudar">Ayudar</Link>
          </nav>
        </div>
        <div className="footer-column">
          <span className="footer-column-title">Para el equipo</span>
          <Link className="footer-team-link" href="/equipo/login">Ingreso operativo</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>Hecho para coordinar mejor, cuidar los datos y llegar más lejos.</p>
        <span>Pereira, Risaralda</span>
      </div>
    </footer>
  )
}
