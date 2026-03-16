/**
 * Migration script: SQLite (Strapi) → Payload CMS (PostgreSQL)
 *
 * Usage:
 *   npx tsx scripts/migrate-sqlite.ts
 *
 * Requirements:
 *   - DATABASE_URI env var set to your Supabase PostgreSQL connection string
 *   - PAYLOAD_SECRET env var set
 *   - The Strapi SQLite database file at ../backend/.tmp/data.db
 *   - Run `pnpm add -D better-sqlite3 @types/better-sqlite3` first
 *
 * This script:
 *   1. Reads data from the Strapi SQLite DB
 *   2. Connects to Payload (PostgreSQL)
 *   3. Creates all records in Payload
 */

import 'dotenv/config'
import path from 'path'

async function main() {
  // Dynamic imports to handle optional dependencies
  const Database = (await import('better-sqlite3')).default
  const { getPayload } = await import('payload')
  const config = (await import('../payload.config')).default

  const DB_PATH = path.resolve(__dirname, '../../backend/.tmp/data.db')

  console.log('Opening SQLite database:', DB_PATH)
  const db = new Database(DB_PATH, { readonly: true })

  console.log('Connecting to Payload...')
  const payload = await getPayload({ config })

  // 1. Migrate Seasons
  console.log('\n--- Migrating Seasons ---')
  const seasons = db.prepare('SELECT * FROM seasons').all() as any[]
  const seasonIdMap = new Map<number, number>() // old ID -> new ID

  for (const s of seasons) {
    const created = await payload.create({
      collection: 'seasons',
      data: {
        name: s.name,
        season_id: String(s.season_id),
        serie_id: String(s.serie_id),
        active: Boolean(s.active),
        archived: Boolean(s.archived),
        start_date: s.start_date || undefined,
        end_date: s.end_date || undefined,
      },
    })
    seasonIdMap.set(s.id, created.id as number)
    console.log(`  Season: ${s.name} (${s.id} -> ${created.id})`)
  }

  // 2. Migrate Players
  console.log('\n--- Migrating Players ---')
  const players = db.prepare('SELECT * FROM joueurs').all() as any[]
  const playerIdMap = new Map<number, number>()

  for (const p of players) {
    const created = await payload.create({
      collection: 'players',
      data: {
        prenom: p.prenom,
        nom: p.nom,
        numero: p.numero,
        poste: p.poste === 'Kiné' ? 'Kine' : p.poste,
        date_naissance: p.date_naissance || undefined,
        capitaine: Boolean(p.capitaine),
        actif: Boolean(p.actif),
        // Photos will need to be re-uploaded manually
      },
    })
    playerIdMap.set(p.id, created.id as number)
    console.log(`  Player: ${p.prenom} ${p.nom} (${p.id} -> ${created.id})`)
  }

  // 3. Migrate Rankings
  console.log('\n--- Migrating Rankings ---')
  const rankings = db.prepare('SELECT * FROM rankings').all() as any[]

  for (const r of rankings) {
    const newSeasonId = seasonIdMap.get(r.season_id)
    await payload.create({
      collection: 'rankings',
      data: {
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
        imported_at: r.imported_at || undefined,
        positionChange: r.positionChange || 'no_change',
        season: newSeasonId || undefined,
      },
    })
  }
  console.log(`  Migrated ${rankings.length} ranking entries`)

  // 4. Migrate Matches (without component stats - those need manual re-entry)
  console.log('\n--- Migrating Matches ---')
  const matches = db.prepare('SELECT * FROM matches').all() as any[]

  for (const m of matches) {
    const newSeasonId = seasonIdMap.get(m.season_id)

    // Try to get field player stats
    const fieldStats = db
      .prepare(
        `SELECT cmpfs.* FROM components_match_player_field_stats cmpfs
         INNER JOIN matches_cmps mc ON mc.component_id = cmpfs.id
         WHERE mc.entity_id = ? AND mc.component_type = 'match.player-field-stat'`
      )
      .all(m.id) as any[]

    const gkStats = db
      .prepare(
        `SELECT cmgs.* FROM components_match_player_goalkeeper_stats cmgs
         INNER JOIN matches_cmps mc ON mc.component_id = cmgs.id
         WHERE mc.entity_id = ? AND mc.component_type = 'match.player-goalkeeper-stat'`
      )
      .all(m.id) as any[]

    const fieldPlayersStats = fieldStats
      .map((fs: any) => {
        const newPlayerId = playerIdMap.get(fs.joueur_id)
        if (!newPlayerId) return null
        return {
          joueur: newPlayerId,
          goals: fs.goals || 0,
          assists: fs.assists || 0,
          yellow_cards: fs.yellow_cards || 0,
          red_cards: fs.red_cards || 0,
        }
      })
      .filter(Boolean)

    const goalkeeperStats = gkStats
      .map((gs: any) => {
        const newPlayerId = playerIdMap.get(gs.joueur_id)
        if (!newPlayerId) return null
        return {
          joueur: newPlayerId,
          goals: gs.goals || 0,
          assists: gs.assists || 0,
          clean_sheet: Boolean(gs.clean_sheet),
          yellow_cards: gs.yellow_cards || 0,
          red_cards: gs.red_cards || 0,
        }
      })
      .filter(Boolean)

    await payload.create({
      collection: 'matches',
      data: {
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
        field_players_stats: fieldPlayersStats,
        goalkeeper_stats: goalkeeperStats,
      },
    })
  }
  console.log(`  Migrated ${matches.length} matches`)

  // 5. Migrate Venues from salles.json
  console.log('\n--- Migrating Venues from salles.json ---')
  const sallesPath = path.resolve(__dirname, '../src/mocks/salles.json')
  const { default: salles } = await import(sallesPath)

  for (const salle of salles) {
    await payload.create({
      collection: 'venues',
      data: {
        short_name: salle.short_name,
        reference: salle.reference,
        street: salle.street,
        street2: salle.street2,
        zip: salle.zip,
        city: salle.city,
        country: salle.country || undefined,
        lffs_id: salle.id,
      },
    })
  }
  console.log(`  Migrated ${salles.length} venues`)

  // 6. Migrate LFFS Updates
  console.log('\n--- Migrating LFFS Updates ---')
  const lffsUpdates = db.prepare('SELECT * FROM lffs_updates').all() as any[]

  for (const u of lffsUpdates) {
    await payload.create({
      collection: 'lffs-updates',
      data: {
        type: u.type,
        last_update: u.last_update || undefined,
        status: u.status || 'success',
        error_message: u.error_message || undefined,
        items_processed: u.items_processed,
      },
    })
  }
  console.log(`  Migrated ${lffsUpdates.length} LFFS update records`)

  // 7. Create default settings
  console.log('\n--- Creating Settings ---')
  await payload.updateGlobal({
    slug: 'settings',
    data: {
      imports: true,
    },
  })
  console.log('  Settings created')

  console.log('\n=== Migration complete! ===')
  console.log('Note: Player photos need to be re-uploaded manually via the admin panel.')
  console.log('Note: Team logos need to be added via the admin panel.')

  db.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
