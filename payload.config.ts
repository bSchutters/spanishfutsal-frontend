import { buildConfig } from 'payload'
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
import { Settings } from '@/payload/globals/Settings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeDashboard: ['@/payload/components/ImportButton'],
    },
  },
  collections: [Users, Players, Media, Matches, Rankings, Seasons, LffsUpdates, Venues, Teams],
  globals: [Settings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'your-secret-key-change-this',
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
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: {
              media: true,
            },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
