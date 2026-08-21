'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Revalida las páginas públicas sin intervenir en el refresco central del portal operativo. */
export function LiveRefresh({ interval = 15000 }: { interval?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname.startsWith('/equipo')) return
    let lastRefresh = 0
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 2000) return
      lastRefresh = Date.now()
      router.refresh()
    }
    const timer = window.setInterval(refresh, interval)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [interval, pathname, router])

  return null
}
