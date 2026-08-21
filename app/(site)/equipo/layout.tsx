import './portal.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Equipo operativo | PLs al llamado',
  robots: { index: false, follow: false },
}

export default function EquipoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
