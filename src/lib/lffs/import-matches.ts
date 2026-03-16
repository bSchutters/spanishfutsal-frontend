import type { Payload } from 'payload'
import { getLffsToken } from './get-token'

const BASE_URL = 'https://gestion.lffs.eu/lms_league_ws/public/api/v1'

interface LffsGame {
  home_team_name: string
  away_team_name: string
  home_score: number | null
  away_score: number | null
  venue_id: number | null
  venue_name: string | null
  serie_reference: string
  date: string | null
  time: string | null
}

export async function importMatches(payload: Payload) {
  try {
    await upsertLffsUpdate(payload, 'matches', { status: 'in_progress' })

    // Find active season
    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const season = seasonsResult.docs[0]

    if (!season) {
      console.log('No active season found')
      await upsertLffsUpdate(payload, 'matches', {
        status: 'error',
        error_message: 'Aucune saison active trouvee',
      })
      return { success: false, error: 'No active season' }
    }

    // Get manual token from settings if available
    const settings = await payload.findGlobal({ slug: 'settings' })
    const token = await getLffsToken({ manualToken: settings.lffs_token })

    const url = `${BASE_URL}/game/byMyLeague?season_id=${season.season_id}&club_id=5075`
    const res = await fetch(url, {
      headers: {
        Authorization: `WP_Access ${token}`,
        Origin: 'https://www.lffs.eu',
        Referer: 'https://www.lffs.eu/',
      },
    })

    if (!res.ok) {
      throw new Error(`LFFS API returned ${res.status}`)
    }

    const data = await res.json()
    const matchs: LffsGame[] = Array.isArray(data.elements) ? data.elements : []

    if (matchs.length === 0) {
      await upsertLffsUpdate(payload, 'matches', {
        status: 'success',
        items_processed: 0,
      })
      return { success: true, created: 0, updated: 0 }
    }

    let created = 0
    let updated = 0

    for (const game of matchs) {
      const normalizedRef = normalizeSerie(game.serie_reference)

      // Check if match exists
      const existing = await payload.find({
        collection: 'matches',
        where: {
          and: [
            { home_team: { equals: game.home_team_name } },
            { away_team: { equals: game.away_team_name } },
            { season: { equals: season.id } },
          ],
        },
        limit: 1,
      })

      const matchData: Record<string, unknown> = {
        home_team: game.home_team_name,
        away_team: game.away_team_name,
        score_home: game.home_score,
        score_away: game.away_score,
        venue_id: game.venue_id,
        venue_name: game.venue_name,
        serie_reference: normalizedRef,
        season: season.id,
      }
      if (game.date) matchData.date = game.date
      if (game.time) matchData.time = game.time

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'matches',
          id: existing.docs[0].id,
          data: matchData,
        })
        updated++
      } else {
        await payload.create({
          collection: 'matches',
          data: matchData,
        })
        created++
      }
    }

    await upsertLffsUpdate(payload, 'matches', {
      status: 'success',
      items_processed: created + updated,
    })

    console.log(`Matches imported: created=${created}, updated=${updated}`)
    return { success: true, created, updated }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error importing matches:', msg)
    await upsertLffsUpdate(payload, 'matches', {
      status: 'error',
      error_message: msg,
    })
    return { success: false, error: msg }
  }
}

function normalizeSerie(raw: string): 'COUPE' | 'P4G' {
  const coupeCodes = ['BTCPRES', 'BTCPPRM']
  return coupeCodes.includes(raw) ? 'COUPE' : 'P4G'
}

async function upsertLffsUpdate(
  payload: Payload,
  type: 'ranking' | 'matches',
  options: { status?: string; error_message?: string; items_processed?: number }
) {
  const { status = 'success', error_message, items_processed } = options

  const existing = await payload.find({
    collection: 'lffs-updates',
    where: { type: { equals: type } },
    limit: 1,
  })

  const updateData: Record<string, unknown> = {
    type,
    last_update: new Date().toISOString(),
    status,
    error_message: error_message || null,
    items_processed: items_processed ?? null,
  }

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'lffs-updates',
      id: existing.docs[0].id,
      data: updateData,
    })
  } else {
    await payload.create({
      collection: 'lffs-updates',
      data: updateData,
    })
  }
}
