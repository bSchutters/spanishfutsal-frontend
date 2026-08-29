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

function requireBinary(name) {
  const probe = spawnSync(name, ['--version'], { encoding: 'utf8' })
  if (probe.error) fail(`${name} introuvable dans le PATH. Voir l en-tete de ce script.`)
  return probe.stdout.trim()
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

console.log(`  ${requireBinary('pg_dump')}`)
requireBinary('pg_restore')

const dumpFile = path.join(os.tmpdir(), `spanishfutsal-${Date.now()}.dump`)

try {
  console.log(`\n  Dump de ${source} ...`)
  const dump = spawnSync(
    'pg_dump',
    ['--format=custom', '--schema=public', '--no-owner', '--no-privileges', '--file', dumpFile, SOURCE],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  )
  if (dump.status !== 0) fail('pg_dump a echoue.')

  console.log(`  Restauration vers ${target} ...`)
  const restore = spawnSync(
    'pg_restore',
    ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', TARGET, dumpFile],
    { stdio: ['ignore', 'inherit', 'inherit'] }
  )
  // pg_restore renvoie 1 sur de simples avertissements (objets absents a supprimer).
  if (restore.status !== 0 && restore.status !== 1) fail('pg_restore a echoue.')

  console.log('\n  Base de dev synchronisee sur la prod.\n')
} finally {
  fs.rmSync(dumpFile, { force: true })
}
