import { buildConfig } from 'payload'
import { fr } from '@payloadcms/translations/languages/fr'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { isAuthenticated } from '@/payload/access'
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
import { Comments } from '@/payload/collections/hub/Comments'
import { Events } from '@/payload/collections/hub/Events'
import { EventTypes } from '@/payload/collections/hub/EventTypes'
import { Feeds } from '@/payload/collections/hub/Feeds'
import { Formats } from '@/payload/collections/hub/Formats'
import { HubMedia } from '@/payload/collections/hub/HubMedia'
import { Ideas } from '@/payload/collections/hub/Ideas'
import { Networks } from '@/payload/collections/hub/Networks'
import { NotificationLog } from '@/payload/collections/hub/NotificationLog'
import { PostTemplates } from '@/payload/collections/hub/PostTemplates'
import { PushSubscriptions } from '@/payload/collections/hub/PushSubscriptions'
import { HubSettings } from '@/payload/globals/HubSettings'
import { Settings } from '@/payload/globals/Settings'

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
    // Le Hub, l'espace prive du club.
    Feeds,
    EventTypes,
    Networks,
    Formats,
    Events,
    PostTemplates,
    Ideas,
    Comments,
    PushSubscriptions,
    NotificationLog,
    HubMedia,
  ],
  globals: [Settings, HubSettings],
  i18n: {
    supportedLanguages: { fr },
    fallbackLanguage: 'fr',
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? (() => { throw new Error('PAYLOAD_SECRET env var is required') })(),
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload/payload-types.ts'),
    /**
     * Depuis le passage du paquet en ESM, Payload sait generer ses types au
     * demarrage de `pnpm dev`. Le projet a ete ecrit sans eux : le fichier
     * genere fait echouer la compilation en huit endroits du code existant
     * (import LFFS, chargeurs du site, audience). On le laisse desactive tant
     * que ces endroits n'ont pas ete relus avec les types.
     */
    autoGenerate: false,
  },
  db: postgresAdapter({
    /**
     * Le schema ne se synchronise plus tout seul : chaque changement de
     * collection passe par une migration versionnee (pnpm migrate:create, puis
     * pnpm migrate). Le dev et la prod partagent la meme base, un push
     * silencieux au demarrage y appliquait n importe quelle branche. Voir
     * docs/base-de-donnees.md.
     */
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  // Les dossiers de l'admin (medias du site, visuels du Hub) : reserves aux personnes connectees, comme le reste de l'API.
  folders: {
    collectionOverrides: [
      ({ collection }) => ({
        ...collection,
        access: { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated },
      }),
    ],
  },
  sharp,
  plugins: [
    vercelBlobStorage({
      collections: {
        media: {
          prefix: 'media',
        },
        // Les visuels du Hub, gardes tels quels : un prefixe a part dans le meme stockage.
        'hub-media': {
          prefix: 'hub',
        },
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
      enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
})
