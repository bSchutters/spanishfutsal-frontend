/**
 * Applique a une base le schema decrit par les collections Payload.
 *
 * A lancer avant de deployer une branche qui ajoute ou modifie un champ : Vercel
 * construit en mode production, ou Payload ne synchronise plus rien, donc les
 * colonnes doivent deja exister quand le nouveau code arrive.
 *
 * Le CLI Payload ne demarre pas sur ce projet (son binaire resout le tsconfig depuis
 * node_modules/payload, donc les alias `@/` du config ne sont jamais resolus). On
 * passe donc par un serveur de developpement ephemere : Payload synchronise le schema
 * a l initialisation, on declenche celle-ci par une requete, puis on coupe.
 *
 * Run: node scripts/db-schema-push.mjs --prod --yes
 *      node scripts/db-schema-push.mjs --yes          (base locale)
 */

import { spawn, spawnSync } from 'child_process'

process.loadEnvFile('.env.local')

const PORT = 3999
const TARGET_PROD = process.argv.includes('--prod')
const CONFIRMED = process.argv.includes('--yes')

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

function label(uri) {
  const { hostname, port, pathname } = new URL(uri)
  return `${hostname}:${port || 5432}${pathname}`
}

const uri = TARGET_PROD ? process.env.PROD_DATABASE_URI : process.env.DATABASE_URI

if (!uri) {
  fail(TARGET_PROD ? 'PROD_DATABASE_URI absent de .env.local.' : 'DATABASE_URI absent de .env.local.')
}

if (TARGET_PROD && process.env.DATABASE_URI && label(uri) === label(process.env.DATABASE_URI)) {
  fail('PROD_DATABASE_URI et DATABASE_URI designent la meme base. Verifiez .env.local.')
}

console.log(`\n  Cible : ${label(uri)}${TARGET_PROD ? '  ** PRODUCTION **' : ''}`)

if (!CONFIRMED) {
  fail('Relancez avec --yes pour confirmer.')
}

// DATABASE_URI est passe par l environnement : Next donne la priorite aux variables
// deja presentes dans process.env sur celles des fichiers .env.
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(PORT)], {
  env: { ...process.env, DATABASE_URI: uri },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => (serverOutput += chunk))
server.stderr.on('data', (chunk) => (serverOutput += chunk))

function stopServer() {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    server.kill('SIGTERM')
  }
}

async function waitFor(check, timeoutMs, everyMs = 1000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, everyMs))
  }
  return false
}

try {
  console.log('  Demarrage du serveur ephemere ...')
  const up = await waitFor(async () => serverOutput.includes('Ready in'), 90_000)
  if (!up) throw new Error(`le serveur n a pas demarre\n${serverOutput.slice(-800)}`)

  console.log('  Synchronisation du schema ...')
  const res = await fetch(`http://localhost:${PORT}/api/teams?limit=1`)
  if (!res.ok) throw new Error(`Payload a repondu ${res.status}\n${serverOutput.slice(-800)}`)

  console.log('\n  Schema applique.\n')
} catch (error) {
  stopServer()
  fail(error.message)
}

stopServer()
process.exit(0)
