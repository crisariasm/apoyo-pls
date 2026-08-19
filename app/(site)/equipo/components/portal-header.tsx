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

type PendingSummary = {
  pending?: number
  latest?: { id?: string; helpType?: string; createdAt?: string } | null
}

type RequestAlert = {
  kind: 'need' | 'offer'
  title: string
  message: string
}

export function PortalHeader({ name, role, modules }: { name: string; role: DashboardRole; modules: PortalModule[] }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [requestAlert, setRequestAlert] = useState<RequestAlert | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const previousSummaryRef = useRef<{ pending: number; latestId: string; latestCreatedAt: number } | null>(null)
  const alertTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setMobileOpen(false)
    const activeLink = navRef.current?.querySelector<HTMLElement>('.is-active')
    activeLink?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [pathname])

  useEffect(() => {
    const refreshInterval = 45 * 60 * 1000
    const lastRefreshRef = { value: 0 }
    let cancelled = false

    const refreshSession = async (force = false) => {
      const now = Date.now()
      if (!force && now - lastRefreshRef.value < refreshInterval) return
      lastRefreshRef.value = now

      try {
        const response = await fetch('/api/equipo/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (response.status === 401 && !cancelled) window.location.assign('/equipo/login')
      } catch {
        // Un fallo temporal de red no cierra la sesión ni interrumpe el trabajo.
      }
    }

    void refreshSession(true)
    const interval = window.setInterval(() => void refreshSession(), refreshInterval)
    const handleFocus = () => void refreshSession()
    window.addEventListener('focus', handleFocus)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPendingSummary = async () => {
      try {
        const response = await fetch('/api/equipo/administracion?summary=pending', { cache: 'no-store' })
        if (!response.ok) return
        const summary = await response.json() as PendingSummary
        if (cancelled) return

        const pending = Math.max(Number(summary.pending) || 0, 0)
        const latestId = typeof summary.latest?.id === 'string' ? summary.latest.id : ''
        const latestCreatedAt = summary.latest?.createdAt ? new Date(summary.latest.createdAt).getTime() : 0
        const previous = previousSummaryRef.current
        const latestIsNew = Boolean(previous && summary.latest && latestId && latestId !== previous.latestId && latestCreatedAt >= previous.latestCreatedAt)
        const newPendingRequest = Boolean(previous && summary.latest && (pending > previous.pending || latestIsNew))

        setPendingRequests(pending)
        if (newPendingRequest) {
          const isOffer = summary.latest?.helpType === 'ofrecer-ayuda'
          setRequestAlert({
            kind: isOffer ? 'offer' : 'need',
            title: isOffer ? 'Nueva oferta de ayuda' : 'Nueva solicitud de ayuda',
            message: isOffer ? 'Alguien ofreció recursos, tiempo o transporte.' : 'Alguien necesita apoyo del centro.',
          })
          if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
          alertTimerRef.current = window.setTimeout(() => setRequestAlert(null), 8000)
        }
        previousSummaryRef.current = { pending, latestId, latestCreatedAt }
      } catch {
        // El contador conserva su último valor si una consulta temporal falla.
      }
    }

    void loadPendingSummary()
    const interval = window.setInterval(loadPendingSummary, 5000)
    window.addEventListener('focus', loadPendingSummary)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', loadPendingSummary)
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    }
  }, [])

  async function logout() {
    await fetch('/api/equipo/logout', { method: 'POST' })
    window.location.assign('/equipo/login')
  }

  return (
    <>
      {requestAlert && <div className={`staff-request-alert is-${requestAlert.kind}`} role="alert"><span className="staff-request-alert-mark" aria-hidden="true" /><div><strong>{requestAlert.title}</strong><p>{requestAlert.message}</p></div><Link href="/equipo/administracion" onClick={() => setRequestAlert(null)}>Ver solicitudes</Link><button type="button" aria-label="Cerrar aviso" onClick={() => setRequestAlert(null)}>×</button></div>}
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
            const pendingLabel = module.slug === 'administracion' ? `${pendingRequests} solicitudes pendientes` : undefined
            return <Link className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} href={href} key={module.slug} title={module.label} aria-label={pendingLabel ? `${module.label}, ${pendingLabel}` : module.label} onClick={() => setMobileOpen(false)}><span className="staff-nav-symbol" aria-hidden="true">{navSymbols[module.slug]}</span><span>{module.label}</span>{module.slug === 'administracion' && <b className={`staff-nav-count${pendingRequests === 0 ? ' is-zero' : ''}`} aria-label={pendingLabel}>{pendingRequests > 99 ? '99+' : pendingRequests}</b>}</Link>
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
