import { NextResponse } from 'next/server'
import { getMatchs } from '@/lib/getMatchs'
import { getYoutubeLive } from '@/lib/getYoutubeLive'

// La diffusion demarre avant le coup d envoi et la meme duree de match que sur
// le front ferme la fenetre : au-dela, la rencontre est consideree terminee.
const WINDOW_BEFORE_MS = 30 * 60 * 1000
const WINDOW_AFTER_MS = 70 * 60 * 1000

// Une minute cote navigateur comme cote CDN : la reponse change pendant la
// rencontre, elle ne peut pas etre figee comme les autres routes publiques.
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
}

const OFF_AIR = { live: false, url: null, source: null }

export const dynamic = 'force-dynamic'

/**
 * La LFFS donne la date et l heure en heure belge, sans decalage ecrit. Le
 * navigateur du visiteur les lit donc juste, mais pas la fonction Vercel, qui
 * tourne en UTC : une rencontre de 20h30 y serait placee deux heures trop tot.
 */
function brusselsOffset(utcMs: number): number {
  const date = new Date(utcMs)
  const local = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Brussels' }))
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  return local.getTime() - utc.getTime()
}

function kickoff(date: string, time: string): number {
  const naive = Date.parse(`${date}T${time.slice(0, 5)}:00Z`)
  return Number.isNaN(naive) ? NaN : naive - brusselsOffset(naive)
}

/**
 * Y a-t-il une diffusion en cours, et a quelle adresse.
 *
 * L interrogation de YouTube n a lieu que si une rencontre est en cours : sans
 * cette condition, une verification toutes les trois minutes autour de l horloge
 * epuiserait a elle seule cinq fois le quota quotidien.
 */
export async function GET() {
  try {
    const matchs = await getMatchs()
    const now = Date.now()

    const current = matchs.find((match) => {
      if (!match.date || !match.time) return false
      const start = kickoff(match.date, match.time)
      if (Number.isNaN(start)) return false
      return now >= start - WINDOW_BEFORE_MS && now < start + WINDOW_AFTER_MS
    })

    if (!current) {
      return NextResponse.json(OFF_AIR, { headers: CACHE_HEADERS })
    }

    // Le champ Lien Live de l admin l emporte sur la detection : il permet de
    // pointer une diffusion qui n est pas sur la chaine du club.
    if (current.liveLink) {
      return NextResponse.json({ live: true, url: current.liveLink, source: 'manuel' }, { headers: CACHE_HEADERS })
    }

    const broadcast = await getYoutubeLive()

    if (!broadcast) {
      return NextResponse.json(OFF_AIR, { headers: CACHE_HEADERS })
    }

    return NextResponse.json({ live: true, url: broadcast.url, source: 'youtube' }, { headers: CACHE_HEADERS })
  } catch (error) {
    // Une erreur ici ne vaut pas une page en echec : le bouton reste masque.
    console.error('Etat du live indisponible :', error)
    return NextResponse.json(OFF_AIR, { headers: CACHE_HEADERS })
  }
}
