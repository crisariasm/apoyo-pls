import Link from 'next/link'
import type { ServerProps } from 'payload'

function canMonitor(user: ServerProps['user']) {
  const role = user && typeof user === 'object' ? (user as { role?: unknown }).role : null
  return role === 'admin' || role === 'super-admin'
}

export function MonitoringNavLink({ user }: ServerProps) {
  if (!canMonitor(user)) return null

  return (
    <div className="pls-monitor-nav">
      <Link href="/admin/monitoring">
        <span className="pls-monitor-nav__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M4 14h3l2-5 3 9 2-6 2 2h4" />
          </svg>
        </span>
        <span>
          <strong>Monitoreo</strong>
          <small>Salud y actividad</small>
        </span>
      </Link>
    </div>
  )
}
