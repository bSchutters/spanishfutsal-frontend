/**
 * Redonne le role admin a un compte, en passant directement par la base.
 *
 * Utile quand on s'est retire soi-meme les droits : la collection Utilisateurs
 * etant reservee aux admins, plus personne ne peut corriger depuis l'interface.
 *
 *   node scripts/fix-admin.mjs bryan021@hotmail.be
 */
import { readFileSync, readdirSync } from 'node:fs'

const email = process.argv[2]
if (!email) {
  console.error('Usage : node scripts/fix-admin.mjs <email>')
  process.exit(1)
}

// pg est une dependance transitive de @payloadcms/db-postgres, rangee par pnpm
// dans son store : on l'y prend plutot que de l'ajouter au package.json.
const dir = readdirSync('node_modules/.pnpm').find((d) => d.startsWith('pg@'))
const pg = (await import(new URL(`../node_modules/.pnpm/${dir}/node_modules/pg/lib/index.js`, import.meta.url).href)).default

const env = readFileSync('.env.local', 'utf8')
const uri = env
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URI='))
  ?.slice('DATABASE_URI='.length)
  .trim()
  .replace(/^["']|["']$/g, '')

if (!uri) {
  console.error('DATABASE_URI introuvable dans .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: uri })
await client.connect()
console.log('Base :', new URL(uri).host, '\n')

const before = await client.query('SELECT id, email, role FROM users ORDER BY id')
console.log('Avant :')
console.table(before.rows)

const target = before.rows.find((r) => r.email === email)
if (!target) {
  console.error(`\nAucun compte avec l'adresse ${email}. Rien n'a ete modifie.`)
  await client.end()
  process.exit(1)
}

if (target.role === 'admin') {
  console.log(`\n${email} est deja admin, rien a faire.`)
  await client.end()
  process.exit(0)
}

await client.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email])

const after = await client.query('SELECT id, email, role FROM users ORDER BY id')
console.log('\nApres :')
console.table(after.rows)
console.log(`\n${email} est de nouveau admin. Recharge l'onglet de l'administration.`)

await client.end()
