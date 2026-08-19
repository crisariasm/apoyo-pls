'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import type { DashboardRole, PortalModule } from '../../../../lib/staff-portal-config'
import { dashboardRoleLabels } from '../../../../lib/staff-portal-config'

const navSymbols: Record<string, string> = {
  dashboard: '⌂',
  tenemos: '＋',
  necesitamos: '!',
  anuncios: '▤',
  boletin: '▧',
  servicios: '◇',
  inventario: '▦',
  distribucion: '⇄',
  evidencias: '◫',
  comunicados: '◉',
  administracion: '⚙',
}

export function PortalHeader({ name, role, modules }: { name: string; role: DashboardRole; modules: PortalModule[] }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMobileOpen(false)
    const activeLink = navRef.current?.querySelector<HTMLElement>('.is-active')
    activeLink?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [pathname])

  async function logout() {
    await fetch('/api/equipo/logout', { method: 'POST' })
    window.location.assign('/equipo/login')
  }

  return (
    <>
      <button className="staff-mobile-toggle" type="button" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
        <span />
        <span />
        <span />
      </button>
      {mobileOpen && <button className="staff-sidebar-overlay" type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={`staff-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}>
        <div className="staff-sidebar-brand">
          <Link href="/equipo" aria-label="Ir al dashboard de PLs al llamado" onClick={() => setMobileOpen(false)}>
            <Image src="/logo-PLs-rosado.png" alt="PLs al llamado" width={42} height={42} priority />
            <span className="staff-brand-copy"><strong>PLs al llamado</strong><small>Portal operativo</small></span>
          </Link>
          <button className="staff-sidebar-collapse" type="button" aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'} aria-pressed={collapsed} onClick={() => setCollapsed((value) => !value)}>
            <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
          </button>
        </div>
        <div className="staff-sidebar-role">
          <span className="staff-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
          <span className="staff-role-copy"><strong>{name}</strong><small>{dashboardRoleLabels[role]}</small></span>
        </div>
        <nav ref={navRef} className="staff-nav" aria-label="Módulos del portal">
          <Link className={pathname === '/equipo' ? 'is-active' : ''} aria-current={pathname === '/equipo' ? 'page' : undefined} href="/equipo" title="Dashboard" aria-label="Dashboard" onClick={() => setMobileOpen(false)}><span className="staff-nav-symbol" aria-hidden="true">{navSymbols.dashboard}</span><span>Dashboard</span></Link>
          {modules.map((module) => {
            const href = `/equipo/${module.slug}`
            const active = pathname === href
            return <Link className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} href={href} key={module.slug} title={module.label} aria-label={module.label} onClick={() => setMobileOpen(false)}><span className="staff-nav-symbol" aria-hidden="true">{navSymbols[module.slug]}</span><span>{module.label}</span></Link>
          })}
        </nav>
        <div className="staff-sidebar-footer">
          <Link href="/" onClick={() => setMobileOpen(false)}><span aria-hidden="true">↗</span><span>Ver página pública</span></Link>
          <button type="button" onClick={logout}><span aria-hidden="true">⇥</span><span>Cerrar sesión</span></button>
        </div>
      </aside>
    </>
  )
}
