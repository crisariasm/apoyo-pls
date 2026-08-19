import type { Metadata } from 'next'

const siteName = 'PLs al llamado'

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: `${title} | ${siteName}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: path,
      siteName,
      locale: 'es_CO',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
  }
}
