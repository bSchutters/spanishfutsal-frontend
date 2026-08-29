import { buildConfig } from 'payload'
import { fr } from '@payloadcms/translations/languages/fr'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from '@/payload/collections/Users'
import { Players } from '@/payload/collections/Players'
import { Media } from '@/payload/collections/Media'
import { Matches } from '@/payload/collections/Matches'
import { Rankings } from '@/payload/collections/Rankings'
import { Seasons } from '@/payload/collections/Seasons'
import { LffsUpdates } from '@/payload/collections/LffsUpdates'
import { Venues } from '@/payload/collections/Venues'
import { Teams } from '@/payload/collections/Teams'
import { Sponsors } from '@/payload/collections/Sponsors'
import { Settings } from '@/payload/globals/Settings'
import { SponsorsPage } from '@/payload/globals/SponsorsPage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | UD Asturiana',
      icons: [{ url: '/assets/images/svg/logo-asturiana.svg' }],
    },
    components: {
      beforeDashboard: ['@/payload/components/ImportButton'],
      beforeNavLinks: ['@/payload/components/DashboardLink'],
      afterNavLinks: [
        '@/payload/components/SponsorNavLinks',
        '@/payload/components/BackToSite',
      ],
      graphics: {
        Logo: '@/payload/components/Logo',
        Icon: '@/payload/components/Icon',
      },
    },
    theme: 'dark',
  },
  collections: [Users, Players, Media, Matches, Rankings, Seasons, LffsUpdates, Venues, Teams, Sponsors],
  globals: [Settings, SponsorsPage],
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? (() => { throw new Error('PAYLOAD_SECRET env var is required') })(),
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
      enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
})
