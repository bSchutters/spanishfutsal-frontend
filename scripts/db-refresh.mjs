/**
 * Ecrase le schema `public` de la base de DEV avec un instantane de la PROD.
 *
 * L instantane est pris au moment ou la commande est lancee : il n y a aucun lien
 * permanent entre les deux bases. Tout ce que contient la base cible est perdu.
 *
 * Prerequis : pg_dump et pg_restore (>= version du serveur Supabase) dans le PATH.
 *   winget install -e --id PostgreSQL.PostgreSQL.17
 *
 * SOURCE_DATABASE_URI doit etre une connexion DIRECTE a la prod (port 5432) : le
 * pooler transactionnel de Supabase (port 6543) ne supporte pas pg_dump.
 * TARGET_DATABASE_URI pointe sur le Postgres local.
 *
 * Run: node scripts/db-refresh.mjs --yes
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Les URL vivent dans .env.local, que Node ne charge pas tout seul.
try {
  process.loadEnvFile('.env.local')
} catch {
  // absent : on se rabat sur l environnement du shell
}

const SOURCE = process.env.SOURCE_DATABASE_URI
const TARGET = process.env.TARGET_DATABASE_URI

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

function identity(uri) {
  const { hostname, port, pathname } = new URL(uri)
  return `${hostname}:${port || 5432}${pathname}`
}

/**
 * Cherche l executable dans le PATH, puis dans l installation Windows standard :
 * le programme d installation de PostgreSQL n ajoute pas son dossier bin au PATH.
 */
function resolveBinary(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name

  const inPath = spawnSync(exe, ['--version'], { encoding: 'utf8' })
  if (!inPath.error) return { command: exe, version: inPath.stdout.trim() }

  if (process.platform === 'win32') {
    const root = 'C:/Program Files/PostgreSQL'
    const versions = fs.existsSync(root)
      ? fs
          .readdirSync(root)
          .map(Number)
          .filter(Number.isFinite)
          .sort((a, b) => b - a)
      : []

    for (const version of versions) {
      const candidate = path.join(root, String(version), 'bin', exe)
      if (!fs.existsSync(candidate)) continue
      const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' })
      if (!probe.error) return { command: candidate, version: probe.stdout.trim() }
    }
  }

  fail(`${name} introuvable. Installez PostgreSQL : winget install -e --id PostgreSQL.PostgreSQL.17`)
}

if (!SOURCE || !TARGET) {
  fail('Definissez SOURCE_DATABASE_URI (prod, lue) et TARGET_DATABASE_URI (dev, ecrasee).')
}

let source
let target
try {
  source = identity(SOURCE)
  target = identity(TARGET)
} catch {
  fail('URL invalide : attendu postgresql://user:password@host:5432/base')
}

if (source === target) {
  fail(`Source et cible designent la meme base (${source}). Refus d ecraser la production.`)
}

if (!process.argv.includes('--yes')) {
  console.log(`\n  Source (lue)     : ${source}`)
  console.log(`  Cible (ECRASEE)  : ${target}`)
  fail('Relancez avec --yes pour confirmer l ecrasement de la cible.')
}

const pgDump = resolveBinary('pg_dump')
const pgRestore = resolveBinary('pg_restore')
console.log(`  ${pgDump.version}`)

const dumpFile = path.join(os.tmpdir(), `spanishfutsal-${Date.now()}.dump`)

try {
  console.log(`\n  Dump de ${source} ...`)
  const dump = spawnSync(
    pgDump.command,
    ['--format=custom', '--schema=public', '--no-owner', '--no-privileges', '--file', dumpFile, SOURCE],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  )
  if (dump.status !== 0) fail('pg_dump a echoue.')

  console.log(`  Restauration vers ${target} ...`)
  const restore = spawnSync(
    pgRestore.command,
    ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', TARGET, dumpFile],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  )
  // pg_restore renvoie 1 sur de simples avertissements (objets absents a supprimer).
  if (restore.status !== 0 && restore.status !== 1) fail('pg_restore a echoue.')

  console.log('\n  Base de dev synchronisee sur la prod.\n')
} finally {
  fs.rmSync(dumpFile, { force: true })
}
