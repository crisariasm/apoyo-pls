import Image from 'next/image'
import Link from 'next/link'

const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/recursos', label: 'Qué tenemos' },
  { href: '/necesidades', label: 'Qué necesitamos' },
  { href: '/distribucion', label: 'Distribución' },
  { href: '/comunicados', label: 'Comunicados' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/boletin', label: 'Boletín' },
  { href: '/ayudar', label: 'Ayudar' },
  { href: '/solicitar-apoyo', label: 'Solicitar apoyo' },
]

export function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Ir al inicio de PLs al llamado">
        <Image className="brand-logo" src="/logo-PLs-rosado.png" alt="PLs al llamado" width={42} height={42} priority />
        <span className="brand-copy"><strong>PLs</strong><small>al llamado</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((item) => (
          <Link key={item.href} className="nav-item" href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="mobile-route-nav" aria-label="Secciones del centro">
        <Link className="mobile-nav-home" href="/">Inicio</Link>
        <Link className="mobile-nav-priority" href="/recursos">Qué tenemos</Link>
        <Link className="mobile-nav-priority mobile-nav-help" href="/ayudar">Ayudar</Link>
        <details className="mobile-more">
          <summary>Ver más <span className="mobile-more-arrow" aria-hidden="true">→</span></summary>
          <div className="mobile-more-menu">
            {navigation.filter((item) => !['/', '/recursos', '/ayudar'].includes(item.href)).map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
            <Link className="mobile-more-compact-help" href="/ayudar">Ayudar</Link>
          </div>
        </details>
      </nav>
    </header>
  )
}
