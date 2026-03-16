/**
 * Migration: Strapi SQLite → Payload CMS via REST API
 *
 * Prerequisites: pnpm dev must be running
 * Run: node scripts/migrate-sqlite.mjs
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../../backend/.tmp/data.db')
const API_URL = 'http://localhost:3001'

// You need to login first and get a token, or we use the local API
// For simplicity, we'll call the Payload REST API with credentials

let jwt = null

// Use Payload REST API - for collections that have custom route handlers (matches, rankings),
// we need to ensure POST goes through. We add _payload=true query param to differentiate.
async function api(method, endpoint, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (jwt) headers['Authorization'] = `JWT ${jwt}`

  const url = `${API_URL}/api${endpoint}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${endpoint} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function login() {
  console.log('Logging in to Payload...')
  console.log('Enter your admin credentials:')

  // Read email and password from env or hardcode for migration
  const email = process.env.PAYLOAD_ADMIN_EMAIL
  const password = process.env.PAYLOAD_ADMIN_PASSWORD

  if (!email || !password) {
    console.error('Set PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD env vars')
    console.error('Example: PAYLOAD_ADMIN_EMAIL=you@mail.com PAYLOAD_ADMIN_PASSWORD=yourpass node scripts/migrate-sqlite.mjs')
    process.exit(1)
  }

  const res = await api('POST', '/users/login', { email, password })
  jwt = res.token
  console.log('Logged in successfully')
}

async function main() {
  console.log('Opening SQLite:', DB_PATH)
  const db = new Database(DB_PATH, { readonly: true })

  await login()

  // 1. Migrate Seasons (check if already migrated)
  console.log('\n--- Migrating Seasons ---')
  const seasons = db.prepare('SELECT * FROM seasons').all()
  const seasonIdMap = new Map()

  const existingSeasons = await api('GET', '/seasons?limit=100')
  if (existingSeasons.docs && existingSeasons.docs.length > 0) {
    console.log(`  Already migrated (${existingSeasons.docs.length} seasons found), mapping IDs...`)
    // Map old IDs based on name matching
    for (const s of seasons) {
      const match = existingSeasons.docs.find(d => d.name === s.name)
      if (match) {
        seasonIdMap.set(s.id, match.id)
        console.log(`  Season: ${s.name} (old:${s.id} → existing:${match.id})`)
      }
    }
  } else {
    for (const s of seasons) {
      const created = await api('POST', '/seasons', {
        name: s.name,
        season_id: String(s.season_id),
        serie_id: String(s.serie_id),
        active: Boolean(s.active),
        archived: Boolean(s.archived),
      })
      seasonIdMap.set(s.id, created.doc.id)
      console.log(`  Season: ${s.name} (old:${s.id} → new:${created.doc.id})`)
    }
  }

  // 2. Migrate Players (check if already migrated)
  console.log('\n--- Migrating Players ---')
  const players = db.prepare('SELECT * FROM joueurs').all()
  const playerIdMap = new Map()

  const existingPlayers = await api('GET', '/players?limit=100')
  if (existingPlayers.docs && existingPlayers.docs.length > 0) {
    console.log(`  Already migrated (${existingPlayers.docs.length} players found), mapping IDs...`)
    for (const p of players) {
      const match = existingPlayers.docs.find(d => d.prenom === p.prenom && d.nom === p.nom)
      if (match) {
        playerIdMap.set(p.id, match.id)
        console.log(`  Player: ${p.prenom} ${p.nom} (old:${p.id} → existing:${match.id})`)
      }
    }
  } else {
    for (const p of players) {
      const created = await api('POST', '/players', {
        prenom: p.prenom,
        nom: p.nom,
        numero: p.numero,
        poste: p.poste === 'Kiné' ? 'Kine' : p.poste,
        date_naissance: p.date_naissance || undefined,
        capitaine: Boolean(p.capitaine),
        actif: Boolean(p.actif),
      })
      playerIdMap.set(p.id, created.doc.id)
      console.log(`  Player: ${p.prenom} ${p.nom} (old:${p.id} → new:${created.doc.id})`)
    }
  }

  // 3. Migrate Rankings
  console.log('\n--- Migrating Rankings ---')
  const rankings = db.prepare('SELECT * FROM rankings').all()
  const rankingSeasonLnk = db.prepare('SELECT * FROM rankings_season_lnk').all()
  const rankingSeasonMap = new Map()
  for (const lnk of rankingSeasonLnk) {
    rankingSeasonMap.set(lnk.ranking_id, lnk.season_id)
  }

  for (const r of rankings) {
    const oldSeasonId = rankingSeasonMap.get(r.id)
    const newSeasonId = oldSeasonId ? seasonIdMap.get(oldSeasonId) : undefined

    await api('POST', '/rankings', {
      team_name: r.team_name,
      position: r.position,
      played: r.played,
      points: r.points,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals_for: r.goals_for,
      goals_against: r.goals_against,
      goal_difference: r.goal_difference,
      result_sequence: r.result_sequence,
      imported_at: r.imported_at ? new Date(r.imported_at).toISOString() : undefined,
      positionChange: r.position_change || 'no_change',
      season: newSeasonId || undefined,
    })
  }
  console.log(`  Migrated ${rankings.length} ranking entries`)

  // 4. Migrate Matches with stats
  console.log('\n--- Migrating Matches ---')
  const matches = db.prepare('SELECT * FROM matches').all()
  const matchSeasonLnk = db.prepare('SELECT * FROM matches_season_lnk').all()
  const matchSeasonMap = new Map()
  for (const lnk of matchSeasonLnk) {
    matchSeasonMap.set(lnk.match_id, lnk.season_id)
  }

  // Build component mappings
  const matchCmps = db.prepare('SELECT * FROM matches_cmps').all()
  const fieldStats = db.prepare('SELECT * FROM components_match_player_field_stats').all()
  const fieldStatsLnk = db.prepare('SELECT * FROM components_match_player_field_stats_joueur_lnk').all()
  const gkStats = db.prepare('SELECT * FROM components_match_player_goalkeeper_stats').all()
  const gkStatsLnk = db.prepare('SELECT * FROM components_match_player_goalkeeper_stats_joueur_lnk').all()

  const fieldStatJoueurMap = new Map()
  for (const lnk of fieldStatsLnk) {
    fieldStatJoueurMap.set(lnk.player_field_stat_id, lnk.joueur_id)
  }
  const gkStatJoueurMap = new Map()
  for (const lnk of gkStatsLnk) {
    gkStatJoueurMap.set(lnk.player_goalkeeper_stat_id, lnk.joueur_id)
  }
  const fieldStatMap = new Map()
  for (const fs of fieldStats) {
    fieldStatMap.set(fs.id, fs)
  }
  const gkStatDataMap = new Map()
  for (const gs of gkStats) {
    gkStatDataMap.set(gs.id, gs)
  }

  for (const m of matches) {
    const oldSeasonId = matchSeasonMap.get(m.id)
    const newSeasonId = oldSeasonId ? seasonIdMap.get(oldSeasonId) : undefined

    // Field player stats
    const matchFieldCmps = matchCmps.filter(
      c => c.entity_id === m.id && c.component_type === 'match.player-field-stat'
    )
    const field_players_stats = matchFieldCmps
      .map(c => {
        const stat = fieldStatMap.get(c.cmp_id)
        const oldJoueurId = fieldStatJoueurMap.get(c.cmp_id)
        const newJoueurId = oldJoueurId ? playerIdMap.get(oldJoueurId) : undefined
        if (!stat || !newJoueurId) return null
        return {
          joueur: newJoueurId,
          goals: stat.goals || 0,
          assists: stat.assists || 0,
          yellow_cards: stat.yellow_cards || 0,
          red_cards: stat.red_cards || 0,
        }
      })
      .filter(Boolean)

    // Goalkeeper stats
    const matchGkCmps = matchCmps.filter(
      c => c.entity_id === m.id && c.component_type === 'match.player-goalkeeper-stat'
    )
    const goalkeeper_stats = matchGkCmps
      .map(c => {
        const stat = gkStatDataMap.get(c.cmp_id)
        const oldJoueurId = gkStatJoueurMap.get(c.cmp_id)
        const newJoueurId = oldJoueurId ? playerIdMap.get(oldJoueurId) : undefined
        if (!stat || !newJoueurId) return null
        return {
          joueur: newJoueurId,
          goals: stat.goals || 0,
          assists: stat.assists || 0,
          clean_sheet: Boolean(stat.clean_sheet),
          yellow_cards: stat.yellow_cards || 0,
          red_cards: stat.red_cards || 0,
        }
      })
      .filter(Boolean)

    await api('POST', '/matches', {
      home_team: m.home_team,
      away_team: m.away_team,
      score_home: m.score_home,
      score_away: m.score_away,
      date: m.date || undefined,
      time: m.time || undefined,
      venue_id: m.venue_id,
      venue_name: m.venue_name,
      live_link: m.live_link || undefined,
      replay_link: m.replay_link || undefined,
      serie_reference: m.serie_reference,
      season: newSeasonId || undefined,
      field_players_stats,
      goalkeeper_stats,
    })

    const statsInfo = field_players_stats.length + goalkeeper_stats.length > 0
      ? ` (${field_players_stats.length} field + ${goalkeeper_stats.length} gk stats)`
      : ''
    console.log(`  Match: ${m.home_team} vs ${m.away_team}${statsInfo}`)
  }

  // 5. Migrate Venues
  console.log('\n--- Migrating Venues ---')
  const sallesPath = path.resolve(__dirname, '../src/mocks/salles.json')
  const salles = JSON.parse(fs.readFileSync(sallesPath, 'utf8'))

  let venueCount = 0
  for (const salle of salles) {
    if (!salle.short_name) continue
    try {
      await api('POST', '/venues', {
        short_name: salle.short_name,
        reference: salle.reference,
        street: salle.street,
        street2: salle.street2,
        zip: salle.zip,
        city: salle.city,
        country: salle.country || undefined,
        lffs_id: salle.id,
      })
      venueCount++
    } catch (e) {
      console.log(`  Skipped venue ${salle.short_name}: ${e.message?.slice(0, 80)}`)
    }
  }
  console.log(`  Migrated ${venueCount} venues`)

  // 6. Settings
  console.log('\n--- Settings ---')
  try {
    await api('POST', '/globals/settings', { imports: true })
  } catch {
    console.log('  (Settings may already exist, skipping)')
  }
  console.log('  Auto-import enabled')

  console.log('\n=== Migration complete! ===')
  console.log('Note: Player photos need to be re-uploaded via /admin')

  db.close()
  process.exit(0)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
