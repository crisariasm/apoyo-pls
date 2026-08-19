import type { ReactNode } from 'react'

import type { DashboardRole, PortalModule } from '../../../../lib/staff-portal-config'
import { PortalHeader } from './portal-header'
import { StaffLiveProvider } from './staff-live-refresh'

export function PortalShell({ children, name, userId, role, modules, refreshDashboard = false }: { children: ReactNode; name: string; userId: string; role: DashboardRole; modules: PortalModule[]; refreshDashboard?: boolean }) {
  return <StaffLiveProvider refreshDashboard={refreshDashboard}><div className="staff-portal"><PortalHeader name={name} userId={userId} role={role} modules={modules} /><main className="staff-main">{children}</main></div></StaffLiveProvider>
}
