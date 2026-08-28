/**
 * Seeds the `teams` collection from the old hardcoded maps
 * (getTeamName.ts / getTeamLogo.ts / getDisplayTeamName.ts).
 *
 * Idempotent: a team already registered under one of its LFFS names is skipped.
 * Logos found in /public are uploaded to the media collection and linked.
 *
 * Prerequisites: pnpm dev must be running
 * Run: PAYLOAD_ADMIN_EMAIL=you@mail.com PAYLOAD_ADMIN_PASSWORD=yourpass node scripts/seed-teams.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const API_URL = process.env.PAYLOAD_API_URL || 'http://localhost:3000'

const TEAMS = [
  { lffs: ['SPORTING ROJA BRUXELLES', 'UNION DEPORTIVA ASTURIANA BRUXELLES'], name: 'UD Asturiana', logo: 'assets/images/svg/logo-asturiana.svg', isClub: true },
  { lffs: ['FUTSAL 11 ÉTOILES BRUXELLES'], name: 'FT 11 Étoiles' },
  { lffs: ['RACING WHITE WOLUWE FUTSAL 2'], name: 'Racing White Woluwe 2' },
  { lffs: ['MAKASI BRUXELLES 2'], name: 'MAKASI 2' },
  { lffs: ['FC DUCKSTER BRUXELLES'], name: 'FC Duckster' },
  { lffs: ['FC AÏT BRUXELLES'], name: 'FC Aït', logo: 'assets/images/svg/teams/ait.svg' },
  { lffs: ['FSE JETTE CREW 2'], name: 'FSE Jette Crew 2' },
  { lffs: ['FC SOKOL BRUXELLES 3'], name: 'FC Sokol 3' },
  { lffs: ['FC SOKOL BRUXELLES 2'], name: 'FC Sokol 2' },
  { lffs: ['ATLAS BRUSSEL'], name: 'ATLAS' },
  { lffs: ['DB TEAM WOLUWE-SAINT-LAMBERT'], name: 'DB Team' },
  { lffs: ['GYM ÉQUILIBRE MAROLLES BRUXELLES 2'], name: 'G.E. Marolles 2' },
  { lffs: ['CANONNIERS ETTERBEEK'], name: 'Canonniers' },
  { lffs: ['MAMBO SCHAERBEEK NP'], name: 'Mambo NP' },
  { lffs: ['BIGS BROS WINGMEN LA HULPE 1'], name: 'Bigs Bros Wingmen 1' },
  { lffs: ['TP MAKASI AUDERGHEM 2'], name: 'TP Makasi 2', logo: 'assets/images/svg/teams/makasi.svg' },
  { lffs: ['FC LA RELÈVE BRUXELLES'], name: 'FC La Relève', logo: 'assets/images/svg/teams/releve.svg' },
  { lffs: ['FC SCABAL BRUXELLES'], name: 'FC Scabal' },
  { lffs: ['FRATERNITE BRUXELLES 1'], name: 'Fraternité 1' },
  { lffs: ['JUVE PORT BRUXELLES 2'], name: 'Juve Port 2', logo: 'assets/images/svg/teams/juveport.svg' },
  { lffs: ['BRUXELLES RED LABEL 2'], name: 'Red Label 2' },
  { lffs: ['LUPOPO BRUXELLES 2'], name: 'Lupopo 2', logo: 'assets/images/svg/teams/lupopo.svg' },
  { lffs: ['THE MOTTS BERCHEM-SAINTE-AGATHE'], name: 'The Motts' },
  { lffs: ['PHOENIX EVERE 2'], name: 'Phoenix Evere 2', logo: 'assets/images/svg/teams/phoenix.svg' },
]

let jwt = null

async function api(method, endpoint, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (jwt) headers['Authorization'] = `JWT ${jwt}`

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) throw new Error(`${method} ${endpoint} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function login() {
  const email = process.env.PAYLOAD_ADMIN_EMAIL
  const password = process.env.PAYLOAD_ADMIN_PASSWORD

  if (!email || !password) {
    console.error('Set PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD env vars')
    process.exit(1)
  }

  const res = await api('POST', '/users/login', { email, password })
  jwt = res.token
  console.log('Logged in successfully')
}

function normalizeTeamKey(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

async function uploadLogo(relativePath, alt) {
  const absolute = path.join(PUBLIC_DIR, relativePath)
  if (!fs.existsSync(absolute)) {
    console.warn(`  ! logo not found, skipped: ${relativePath}`)
    return null
  }

  const filename = path.basename(absolute)

  const existing = await api('GET', `/media?where[filename][equals]=${encodeURIComponent(filename)}&limit=1`)
  if (existing.docs?.length) return existing.docs[0].id

  const form = new FormData()
  form.append('file', new Blob([fs.readFileSync(absolute)], { type: 'image/svg+xml' }), filename)
  form.append('_payload', JSON.stringify({ alt }))

  const res = await fetch(`${API_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${jwt}` },
    body: form,
  })

  if (!res.ok) {
    console.warn(`  ! logo upload failed (${res.status}), team created without logo: ${filename}`)
    return null
  }

  const json = await res.json()
  return json.doc.id
}

async function main() {
  await login()

  const existing = await api('GET', '/teams?limit=500&depth=0')
  const known = new Set()
  for (const team of existing.docs ?? []) {
    for (const lffsName of team.lffs_names ?? []) known.add(normalizeTeamKey(lffsName))
    known.add(normalizeTeamKey(team.name))
  }

  let created = 0
  let skipped = 0

  for (const team of TEAMS) {
    if (team.lffs.some((lffsName) => known.has(normalizeTeamKey(lffsName)))) {
      console.log(`  = ${team.name} (already present)`)
      skipped++
      continue
    }

    const logo = team.logo ? await uploadLogo(team.logo, `Logo ${team.name}`) : null

    await api('POST', '/teams', {
      lffs_names: team.lffs,
      name: team.name,
      is_club: Boolean(team.isClub),
      ...(logo && { logo }),
    })

    console.log(`  + ${team.name}${logo ? ' (with logo)' : ''}`)
    created++
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
