import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { es } from 'payload/i18n/es'
import sharp from 'sharp'

import { Announcements } from './collections/Announcements'
import { AidIntakes } from './collections/AidIntakes'
import { Bulletins } from './collections/Bulletins'
import { CommunityNotices } from './collections/CommunityNotices'
import { Distributions } from './collections/Distributions'
import { DistributionEvidence } from './collections/DistributionEvidence'
import { Media } from './collections/Media'
import { Needs } from './collections/Needs'
import { Resources } from './collections/Resources'
import { SiteSettings } from './collections/SiteSettings'
import { Services } from './collections/Services'
import { SupportRequests } from './collections/SupportRequests'
import { Users } from './collections/Users'
import { VolunteerActivities } from './collections/VolunteerActivities'
import { withAuditFields } from './lib/audit-fields'

const payloadSecret = process.env.PAYLOAD_SECRET || ''
if (process.env.NODE_ENV === 'production' && payloadSecret.length < 32) {
  throw new Error('PAYLOAD_SECRET debe existir y tener al menos 32 caracteres en producción.')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — PLs al llamado',
      description: 'Panel operativo del centro de acopio PLs al llamado',
    },
  },
  collections: [
    withAuditFields(Users),
    withAuditFields(AidIntakes),
    withAuditFields(Resources),
    withAuditFields(Needs),
    withAuditFields(Distributions),
    withAuditFields(DistributionEvidence),
    withAuditFields(Announcements),
    withAuditFields(CommunityNotices),
    withAuditFields(Services),
    withAuditFields(Bulletins),
    withAuditFields(VolunteerActivities),
    withAuditFields(SupportRequests),
    withAuditFields(Media),
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  i18n: {
    fallbackLanguage: 'es',
    supportedLanguages: { es },
  },
  secret: payloadSecret || 'pls-al-llamado-local-secret-change-me',
  typescript: { outputFile: './payload-types.ts' },
  db: postgresAdapter({
    idType: 'uuid',
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    push: process.env.NODE_ENV !== 'production',
  }),
  sharp,
  cors: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'],
  graphQL: { disable: false },
})
