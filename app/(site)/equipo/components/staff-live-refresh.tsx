'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export type PendingSummary = {
  pending: number
  latest: { id?: string; source?: string; helpType?: string; createdAt?: string } | null
}

export type StaffModuleSnapshot = {
  docs?: Record<string, unknown>[]
  page?: number
  totalPages?: number
  totalDocs?: number
  limit?: number
  message?: string
}

type ModuleSubscriber = {
  token: number
  callback: (snapshot: StaffModuleSnapshot) => void
}

type StaffLiveContextValue = {
  pendingSummary: PendingSummary | null
  registerModule: (url: string, callback: (snapshot: StaffModuleSnapshot) => void) => () => void
}

const StaffLiveContext = createContext<StaffLiveContextValue | null>(null)
const POLL_INTERVAL = 5000
const MIN_REQUEST_GAP = 1500
const DASHBOARD_REFRESH_INTERVAL = 15000

export function StaffLiveProvider({ children, refreshDashboard = false }: { children: ReactNode; refreshDashboard?: boolean }) {
  const router = useRouter()
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null)
  const subscribersRef = useRef(new Map<string, Map<number, ModuleSubscriber>>())
  const tokenRef = useRef(0)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const lastRequestAtRef = useRef(0)
  const lastDashboardRefreshAtRef = useRef(0)
  const unmountedRef = useRef(false)

  const load = useCallback(async (force = false) => {
    if (unmountedRef.current) return
    if (inFlightRef.current) return inFlightRef.current

    const now = Date.now()
    if (!force && now - lastRequestAtRef.current < MIN_REQUEST_GAP) return
    lastRequestAtRef.current = now

    const request = (async () => {
      const tasks: Promise<void>[] = [
        fetch('/api/equipo/administracion?summary=pending', { cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) return
            const result = await response.json() as Partial<PendingSummary>
            if (unmountedRef.current) return
            setPendingSummary({
              pending: Math.max(Number(result.pending) || 0, 0),
              latest: result.latest || null,
            })
          })
          .catch(() => undefined),
      ]

      for (const [url, subscribers] of subscribersRef.current.entries()) {
        tasks.push(
          fetch(url, { cache: 'no-store' })
            .then(async (response) => {
              if (!response.ok) return
              const snapshot = await response.json() as StaffModuleSnapshot
              if (unmountedRef.current) return
              for (const subscriber of subscribers.values()) {
                if (subscribers.has(subscriber.token)) subscriber.callback(snapshot)
              }
            })
            .catch(() => undefined),
        )
      }

      await Promise.all(tasks)
      if (refreshDashboard && !unmountedRef.current && document.visibilityState === 'visible' && Date.now() - lastDashboardRefreshAtRef.current >= DASHBOARD_REFRESH_INTERVAL) {
        lastDashboardRefreshAtRef.current = Date.now()
        router.refresh()
      }
    })()

    inFlightRef.current = request
    try {
      await request
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null
    }
  }, [refreshDashboard, router])

  const registerModule = useCallback((url: string, callback: (snapshot: StaffModuleSnapshot) => void) => {
    const token = ++tokenRef.current
    const subscribers = subscribersRef.current.get(url) || new Map<number, ModuleSubscriber>()
    subscribers.set(token, { token, callback })
    subscribersRef.current.set(url, subscribers)

    return () => {
      const current = subscribersRef.current.get(url)
      current?.delete(token)
      if (current && current.size === 0) subscribersRef.current.delete(url)
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false
    void load(true)

    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const interval = window.setInterval(refresh, POLL_INTERVAL)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      unmountedRef.current = true
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      subscribersRef.current.clear()
    }
  }, [load])

  return <StaffLiveContext.Provider value={{ pendingSummary, registerModule }}>{children}</StaffLiveContext.Provider>
}

export function useStaffLive() {
  const context = useContext(StaffLiveContext)
  if (!context) throw new Error('useStaffLive debe utilizarse dentro de StaffLiveProvider.')
  return context
}

export function useStaffModuleRefresh({ url, enabled = true, onData }: { url: string; enabled?: boolean; onData: (snapshot: StaffModuleSnapshot) => void }) {
  const { registerModule } = useStaffLive()
  const callbackRef = useRef(onData)

  useEffect(() => {
    callbackRef.current = onData
  }, [onData])

  useEffect(() => {
    if (!enabled) return
    return registerModule(url, (snapshot) => callbackRef.current(snapshot))
  }, [enabled, registerModule, url])
}
