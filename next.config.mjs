import { withPayload } from '@payloadcms/next/withPayload'
import process from 'node:process'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite compilar sin pisar el .next del servidor de desarrollo.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: false },
  // El asistente lee este documento en tiempo de ejecución: hay que empaquetarlo con la ruta.
  outputFileTracingIncludes: { '/api/chatbot': ['./docs/contexto-asistente.md'] },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' })
    }

    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withPayload(nextConfig)
