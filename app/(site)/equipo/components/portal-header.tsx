'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

import type { DashboardRole, PortalModule } from '../../../../lib/staff-portal-config'
import { dashboardRoleLabels } from '../../../../lib/staff-portal-config'
import { clearAssistantConversation } from './assistant-storage'
import { useStaffLive } from './staff-live-refresh'

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

type RequestAlert = {
  kind: 'need' | 'offer' | 'need-offer'
  title: string
  message: string
}

type RequestAlertBaseline = {
  pending: number
  latestId: string
  latestCreatedAt: number
}

function getRequestAlertBaseline(summary: NonNullable<ReturnType<typeof useStaffLive>['pendingSummary']>): RequestAlertBaseline {
  const createdAt = summary.latest?.createdAt ? new Date(summary.latest.createdAt).getTime() : 0
  return {
    pending: Math.max(Number(summary.pending) || 0, 0),
    latestId: typeof summary.latest?.id === 'string' ? summary.latest.id : '',
    latestCreatedAt: Number.isFinite(createdAt) ? createdAt : 0,
  }
}

function isNewRequest(current: RequestAlertBaseline, previous: RequestAlertBaseline) {
  const newerLatest = Boolean(
    current.latestId
      && current.latestId !== previous.latestId
      && current.latestCreatedAt >= previous.latestCreatedAt,
  )
  return current.pending > previous.pending || newerLatest
}

export function PortalHeader({ name, userId, role, modules }: { name: string; userId: string; role: DashboardRole; modules: PortalModule[] }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [requestAlert, setRequestAlert] = useState<RequestAlert | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const alertBaselineRef = useRef<RequestAlertBaseline | null>(null)
  const alertBaselineInitializedRef = useRef(false)
  const alertTimerRef = useRef<number | null>(null)
  const { pendingSummary } = useStaffLive()
  const pendingRequests = pendingSummary?.pending ?? 0

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
    if (!pendingSummary) return

    const current = getRequestAlertBaseline(pendingSummary)
    const storageKey = `pls-al-llamado:request-alert:${userId}`
    let persisted: RequestAlertBaseline | null = null

    try {
      const stored = window.sessionStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<RequestAlertBaseline>
        if (typeof parsed.pending === 'number' && typeof parsed.latestId === 'string' && typeof parsed.latestCreatedAt === 'number') {
          persisted = {
            pending: Math.max(parsed.pending, 0),
            latestId: parsed.latestId,
            latestCreatedAt: Number.isFinite(parsed.latestCreatedAt) ? parsed.latestCreatedAt : 0,
          }
        }
      }
    } catch {
      persisted = null
    }

    const previous = alertBaselineInitializedRef.current ? alertBaselineRef.current : persisted
    const newPendingRequest = Boolean(previous && isNewRequest(current, previous))

    if (newPendingRequest) {
      const isNeedOffer = pendingSummary.latest?.source === 'need-offer'
      const isOffer = pendingSummary.latest?.helpType === 'ofrecer-ayuda'
      setRequestAlert({
        kind: isNeedOffer ? 'need-offer' : isOffer ? 'offer' : 'need',
        title: isNeedOffer ? 'Nueva disponibilidad para una necesidad' : isOffer ? 'Nueva oferta de ayuda' : 'Nueva solicitud de ayuda',
        message: isNeedOffer ? 'Alguien indicó que tiene un recurso publicado en “Qué necesitamos”.' : isOffer ? 'Alguien ofreció recursos, tiempo o transporte.' : 'Alguien necesita apoyo del centro.',
      })
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
      alertTimerRef.current = window.setTimeout(() => setRequestAlert(null), 8000)
    }

    alertBaselineInitializedRef.current = true
    alertBaselineRef.current = current
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(current))
    } catch {
      // El aviso sigue funcionando aunque el navegador no permita almacenamiento de sesión.
    }
  }, [pendingSummary, userId])

  useEffect(() => () => {
    if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
  }, [])

  async function logout() {
    await fetch('/api/equipo/logout', { method: 'POST' })
    clearAssistantConversation()
    window.location.assign('/equipo/login')
  }

  function toggleSidebar() {
    if (window.matchMedia('(max-width: 720px)').matches) {
      setMobileOpen(false)
      return
    }
    setCollapsed((value) => !value)
  }

  return (
    <>
      {requestAlert && <div className={`staff-request-alert is-${requestAlert.kind}`} role="alert"><span className="staff-request-alert-mark" aria-hidden="true" /><div><strong>{requestAlert.title}</strong><p>{requestAlert.message}</p></div><Link href="/equipo/administracion" onClick={() => setRequestAlert(null)}>Ver solicitudes</Link><button type="button" aria-label="Cerrar aviso" onClick={() => setRequestAlert(null)}>×</button></div>}
      <div className={`staff-mobile-topbar${mobileOpen ? ' is-menu-open' : ''}`}>
        <button className="staff-mobile-toggle" type="button" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
          <span className="staff-mobile-arrow-icon" aria-hidden="true">→</span>
          {pendingRequests > 0 && <b className="staff-mobile-request-count" aria-label={`${pendingRequests} solicitudes pendientes`}>{pendingRequests > 99 ? '99+' : pendingRequests}</b>}
        </button>
        <Link className="staff-mobile-brand" href="/equipo" aria-label="Ir al inicio del equipo de PLs al llamado" onClick={() => setMobileOpen(false)}>
          <Image src="/logo-PLs-rosado.png" alt="PLs al llamado" width={34} height={34} priority />
          <span className="staff-mobile-brand-copy"><strong>PLs al llamado</strong><small>Portal operativo</small></span>
        </Link>
      </div>
      {mobileOpen && <button className="staff-sidebar-overlay" type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={`staff-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}>
        <div className="staff-sidebar-brand">
          <Link href="/equipo" aria-label="Ir al dashboard de PLs al llamado" onClick={() => setMobileOpen(false)}>
            <Image src="/logo-PLs-rosado.png" alt="PLs al llamado" width={42} height={42} priority />
            <span className="staff-brand-copy"><strong>PLs al llamado</strong><small>Portal operativo</small></span>
          </Link>
          <button className="staff-sidebar-collapse" type="button" aria-label={mobileOpen ? 'Cerrar menú de sesiones' : collapsed ? 'Expandir navegación' : 'Contraer navegación'} aria-pressed={collapsed} onClick={toggleSidebar}>
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
