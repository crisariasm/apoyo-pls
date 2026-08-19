import type { Metadata } from 'next'
import '../globals.css'

import { LiveRefresh } from '../components/live-refresh'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: 'PLs al llamado',
  description: 'Centro de acopio y red de apoyo comunitario en Pereira.',
  icons: {
    icon: [
      { url: '/logo-PLs-rosado.png', type: 'image/png', sizes: '1254x1254' },
      { url: '/favicon-PLs.png', type: 'image/png', sizes: '64x64' },
      { url: '/favicon-PLs.ico', type: 'image/x-icon' },
    ],
    shortcut: '/favicon-PLs.png',
    apple: '/apple-touch-icon-PLs.png',
  },
  openGraph: {
    title: 'PLs al llamado',
    description: 'Qué tiene el centro, qué necesita y a dónde llega la ayuda.',
    images: ['/hero-PLs-al-llamado.png'],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><LiveRefresh />{children}</body></html>
}
