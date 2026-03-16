import type { Payload } from 'payload'
import { getLffsToken } from './get-token'
import { upsertLffsUpdate } from './upsert-update'

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

    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const season = seasonsResult.docs[0]

    if (!season) {
      await upsertLffsUpdate(payload, 'matches', {
        status: 'error',
        error_message: 'Aucune saison active trouvee',
      })
      return { success: false, error: 'No active season' }
    }

    const settings = await payload.findGlobal({ slug: 'settings' })
    const token = await getLffsToken({ manualToken: settings.lffs_token, payload })

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
      await upsertLffsUpdate(payload, 'matches', { status: 'success', items_processed: 0 })
      return { success: true, created: 0, updated: 0 }
    }

    // Batch-fetch existing matches for this season (#7 fix)
    const existingResult = await payload.find({
      collection: 'matches',
      where: { season: { equals: season.id } },
      limit: 1000,
    })
    const existingMap = new Map<string, number>()
    for (const doc of existingResult.docs) {
      existingMap.set(`${doc.home_team}|${doc.away_team}`, doc.id as number)
    }

    let created = 0
    let updated = 0

    for (const game of matchs) {
      const normalizedRef = normalizeSerie(game.serie_reference)
      const key = `${game.home_team_name}|${game.away_team_name}`
      const existingId = existingMap.get(key)

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

      if (existingId) {
        await payload.update({ collection: 'matches', id: existingId, data: matchData })
        updated++
      } else {
        await payload.create({ collection: 'matches', data: matchData })
        created++
      }
    }

    await upsertLffsUpdate(payload, 'matches', { status: 'success', items_processed: created + updated })
    console.log(`Matches imported: created=${created}, updated=${updated}`)
    return { success: true, created, updated }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error importing matches:', msg)
    await upsertLffsUpdate(payload, 'matches', { status: 'error', error_message: msg })
    return { success: false, error: msg }
  }
}

function normalizeSerie(raw: string): 'COUPE' | 'P4G' {
  const coupeCodes = ['BTCPRES', 'BTCPPRM']
  return coupeCodes.includes(raw) ? 'COUPE' : 'P4G'
}
