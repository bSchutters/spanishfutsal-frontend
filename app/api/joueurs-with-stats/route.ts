import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayloadClient()

    // Get active season
    const seasonsResult = await payload.find({
      collection: 'seasons',
      where: { active: { equals: true } },
      limit: 1,
    })
    const activeSeason = seasonsResult.docs[0]

    // Get all active players
    const playersResult = await payload.find({
      collection: 'players',
      limit: 1000,
      where: { actif: { equals: true } },
    })

    // Get all matches for the active season with stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matches: any[] = []
    if (activeSeason) {
      const matchesResult = await payload.find({
        collection: 'matches',
        where: { season: { equals: activeSeason.id } },
        limit: 1000,
        depth: 2,
      })
      matches = matchesResult.docs
    }

    // Compute stats for each player
    const playersWithStats = playersResult.docs.map((player) => {
      const stats = {
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        isGoalkeeper: player.poste === 'Gardien',
      }

      for (const match of matches) {
        // Check field player stats
        if (match.field_players_stats) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const playerStat = match.field_players_stats.find((s: any) => {
            const joueurId = typeof s.joueur === 'object' && s.joueur !== null ? s.joueur.id : s.joueur
            return joueurId === player.id
          })
          if (playerStat) {
            stats.matchesPlayed++
            stats.goals += playerStat.goals || 0
            stats.assists += playerStat.assists || 0
            stats.yellowCards += playerStat.yellow_cards || 0
            stats.redCards += playerStat.red_cards || 0
          }
        }

        // Check goalkeeper stats
        if (match.goalkeeper_stats) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gkStat = match.goalkeeper_stats.find((s: any) => {
            const joueurId = typeof s.joueur === 'object' && s.joueur !== null ? s.joueur.id : s.joueur
            return joueurId === player.id
          })
          if (gkStat) {
            stats.matchesPlayed++
            stats.isGoalkeeper = true
            stats.goals += gkStat.goals || 0
            stats.assists += gkStat.assists || 0
            stats.cleanSheets += gkStat.clean_sheet ? 1 : 0
            stats.yellowCards += gkStat.yellow_cards || 0
            stats.redCards += gkStat.red_cards || 0
          }
        }
      }

      // Build photo object in Strapi-compatible format
      const photo = player.photo && typeof player.photo === 'object'
        ? { url: (player.photo as { url?: string }).url }
        : null

      return {
        id: player.id,
        prenom: player.prenom,
        nom: player.nom,
        numero: player.numero,
        poste: player.poste === 'Coach' || player.poste === 'Kine' ? 'Staff' : player.poste,
        photo,
        stats,
        actif: player.actif,
        capitaine: player.capitaine,
      }
    })

    // Also include inactive players
    const inactiveResult = await payload.find({
      collection: 'players',
      limit: 1000,
      where: { actif: { equals: false } },
    })

    const inactivePlayers = inactiveResult.docs.map((player) => {
      const photo = player.photo && typeof player.photo === 'object'
        ? { url: (player.photo as { url?: string }).url }
        : null

      return {
        id: player.id,
        prenom: player.prenom,
        nom: player.nom,
        numero: player.numero,
        poste: player.poste === 'Coach' || player.poste === 'Kine' ? 'Staff' : player.poste,
        photo,
        stats: null,
        actif: player.actif,
        capitaine: player.capitaine,
      }
    })

    return NextResponse.json([...playersWithStats, ...inactivePlayers])
  } catch (error) {
    console.error('Error fetching players with stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
