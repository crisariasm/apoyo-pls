import type { ReactNode } from 'react'

import type { DashboardRole, PortalModule } from '../../../../lib/staff-portal-config'
import { PortalHeader } from './portal-header'

export function PortalShell({ children, name, role, modules }: { children: ReactNode; name: string; role: DashboardRole; modules: PortalModule[] }) {
  return <div className="staff-portal"><PortalHeader name={name} role={role} modules={modules} /><main className="staff-main">{children}</main></div>
}
