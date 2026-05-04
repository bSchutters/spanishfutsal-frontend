import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-static'
export const revalidate = false

async function getPlayersWithStats() {
  const payload = await getPayloadClient()

  const seasonsResult = await payload.find({
    collection: 'seasons',
    where: { active: { equals: true } },
    limit: 1,
  })
  const activeSeason = seasonsResult.docs[0]

  const playersResult = await payload.find({
    collection: 'players',
    limit: 1000,
    where: { actif: { equals: true } },
    depth: 1,
  })

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

  const inactiveResult = await payload.find({
    collection: 'players',
    limit: 1000,
    where: { actif: { equals: false } },
    depth: 1,
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

  return [...playersWithStats, ...inactivePlayers]
}

const getCachedPlayersWithStats = unstable_cache(getPlayersWithStats, ['players'], {
  tags: ['players', 'matches'],
})

export async function GET() {
  try {
    const data = await getCachedPlayersWithStats()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching players with stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
