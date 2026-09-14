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
import { LiveAudience } from '@/payload/collections/LiveAudience'
import { LiveReports } from '@/payload/collections/LiveReports'
import { Settings } from '@/payload/globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const schemaPush = process.env.PAYLOAD_DB_PUSH !== 'false'

if (!schemaPush) {
  // Bruyant volontairement : oublier ce drapeau en place, c'est developper des
  // collections dont les colonnes n'arriveront jamais en base, et ne s'en
  // apercevoir qu'au premier import qui echoue.
  console.warn(
    '\n  PAYLOAD_DB_PUSH=false : le schema ne sera PAS synchronise avec la base.',
    '\n  Aucune colonne ne sera creee. A retirer de .env.local des que possible.\n',
  )
}

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
      afterNavLinks: ['@/payload/components/BackToSite'],
      graphics: {
        Logo: '@/payload/components/Logo',
        Icon: '@/payload/components/Icon',
      },
    },
    theme: 'dark',
  },
  collections: [
    Users,
    Players,
    Media,
    Matches,
    Rankings,
    Seasons,
    LffsUpdates,
    Venues,
    Teams,
    Sponsors,
    LiveAudience,
    LiveReports,
  ],
  globals: [Settings],
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
    /**
     * Le developpement tape dans la base de production, ou Payload aligne le
     * schema au demarrage. Travailler sur une branche dont les collections
     * different de ce qui est en base revient alors a proposer de supprimer les
     * colonnes de l'autre branche.
     *
     * `PAYLOAD_DB_PUSH=false` demarre sans y toucher. A n'utiliser que pour
     * lire ou tester : les colonnes manquantes ne seront pas creees. Voir
     * docs/base-de-donnees.md.
     */
    push: schemaPush,
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
