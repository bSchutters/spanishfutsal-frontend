/**
 * Le site tourne-t-il vraiment, une fois construit ?
 *
 *   pnpm test:site          demarre `next start` sur le dernier `pnpm build`
 *   pnpm test:site:dev      demarre `next dev` (Turbopack), sans toucher au schema
 *
 * `tsc` et `next build` garantissent que le code compile, pas qu'il repond.
 * Une mise a jour de Next ou de Payload peut passer les deux et casser a la
 * premiere requete : page qui plante a l'hydratation, admin qui ne charge
 * plus, image refusee par le proxy. Ce script demarre le serveur, demande
 * chaque page, chaque fichier, chaque API publique et l'admin, puis coupe.
 *
 * Il lit la base (les pages sont generees a partir des vraies donnees) mais
 * n'y ecrit jamais : `PAYLOAD_DB_PUSH=false` est force, meme en mode dev.
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

const MODE_DEV = process.argv.includes('--dev')
const PORT = Number(process.env.PORT_TEST ?? 3777)
const BASE = `http://127.0.0.1:${PORT}`
// En dev, chaque page est compilee a la premiere demande : on laisse le temps.
const DELAI_REQUETE = MODE_DEV ? 90_000 : 20_000
const DELAI_DEMARRAGE = 120_000

const PAGES = ['/', '/a-propos', '/classement', '/contact', '/equipe', '/matchs', '/sponsors']

const FICHIERS: Array<[string, string]> = [
  ['/robots.txt', 'text/plain'],
  ['/sitemap.xml', 'xml'],
  ['/manifest.json', 'json'],
  ['/icon0.svg', 'image/svg'],
  ['/icon1.png', 'image/png'],
  ['/apple-icon.png', 'image/png'],
]

const APIS = [
  '/api/public/seasons',
  '/api/public/matches',
  '/api/public/rankings',
  '/api/public/sponsors',
  '/api/public/joueurs-with-stats',
  // Route Payload : sans cookie, elle repond `{ user: null }` en 200.
  '/api/users/me',
]

let echecs = 0

function ok(nom: string) {
  console.log(`ok    ${nom}`)
}

function rate(nom: string, detail: string) {
  echecs += 1
  console.log(`RATE  ${nom}`)
  console.log(`        ${detail}`)
}

async function demander(chemin: string, init: RequestInit = {}) {
  const controle = new AbortController()
  const minuteur = setTimeout(() => controle.abort(), DELAI_REQUETE)
  try {
    return await fetch(`${BASE}${chemin}`, { redirect: 'manual', ...init, signal: controle.signal })
  } finally {
    clearTimeout(minuteur)
  }
}

/** Une page HTML complete, sans l'ecran d'erreur de Next. */
async function verifierPage(chemin: string, attendu = 200) {
  const nom = `page ${chemin}`
  try {
    const reponse = await demander(chemin)
    const corps = await reponse.text()
    const type = reponse.headers.get('content-type') ?? ''
    if (reponse.status !== attendu) return rate(nom, `statut ${reponse.status}, attendu ${attendu}`)
    if (!type.includes('text/html')) return rate(nom, `content-type ${type}`)
    if (!corps.includes('</html>')) return rate(nom, 'reponse tronquee, pas de </html>')
    // La page 404 vit hors du groupe (app) et n'herite pas de ses metadonnees.
    if (attendu === 200 && !/<title>[^<]+<\/title>/.test(corps)) return rate(nom, 'pas de <title>')
    // En dev, Next marque aussi sa page 404 comme une erreur : seul un 200
    // qui porte ce marqueur est un vrai plantage.
    const ecranErreur = corps.includes('Application error') || (attendu === 200 && corps.includes('__next_error__'))
    if (ecranErreur) return rate(nom, "la page contient l'ecran d'erreur de Next")
    ok(nom)
  } catch (erreur) {
    rate(nom, String(erreur))
  }
}

async function verifierFichier(chemin: string, typeAttendu: string) {
  const nom = `fichier ${chemin}`
  try {
    const reponse = await demander(chemin)
    const type = reponse.headers.get('content-type') ?? ''
    const corps = await reponse.arrayBuffer()
    if (reponse.status !== 200) return rate(nom, `statut ${reponse.status}`)
    if (!type.includes(typeAttendu)) return rate(nom, `content-type ${type}, attendu ${typeAttendu}`)
    if (corps.byteLength === 0) return rate(nom, 'reponse vide')
    ok(nom)
  } catch (erreur) {
    rate(nom, String(erreur))
  }
}

async function verifierApi(chemin: string): Promise<unknown> {
  const nom = `api ${chemin}`
  try {
    const reponse = await demander(chemin)
    const type = reponse.headers.get('content-type') ?? ''
    const texte = await reponse.text()
    if (reponse.status !== 200) return rate(nom, `statut ${reponse.status}`)
    if (!type.includes('application/json')) return rate(nom, `content-type ${type}`)
    const donnees = JSON.parse(texte)
    ok(nom)
    return donnees
  } catch (erreur) {
    rate(nom, String(erreur))
  }
}

/** Le premier objet portant un `id`, ou qu'il soit dans la reponse. */
function premierId(valeur: unknown): string | number | undefined {
  if (Array.isArray(valeur)) {
    for (const element of valeur) {
      const id = premierId(element)
      if (id !== undefined) return id
    }
    return undefined
  }
  if (valeur && typeof valeur === 'object') {
    const objet = valeur as Record<string, unknown>
    if (typeof objet.id === 'string' || typeof objet.id === 'number') return objet.id
    for (const enfant of Object.values(objet)) {
      const id = premierId(enfant)
      if (id !== undefined) return id
    }
  }
  return undefined
}

/**
 * La premiere image matricielle servie par Payload. Les SVG sont ecartes :
 * `next/image` les sert tels quels, sans passer par le proxy.
 */
function premierMediaLocal(valeur: unknown): string | undefined {
  if (typeof valeur === 'string') {
    const estMedia = valeur.startsWith('/api/media/file/') && !/\.svg(\?|$)/.test(valeur)
    return estMedia ? valeur : undefined
  }
  if (Array.isArray(valeur) || (valeur && typeof valeur === 'object')) {
    for (const enfant of Object.values(valeur as Record<string, unknown>)) {
      const trouve = premierMediaLocal(enfant)
      if (trouve) return trouve
    }
  }
  return undefined
}

/** Le proxy d'images de Next accepte-t-il cette adresse locale ? */
async function verifierImage(source: string, nom: string) {
  const chemin = `/_next/image?url=${encodeURIComponent(source)}&w=256&q=75`
  try {
    const reponse = await demander(chemin)
    const type = reponse.headers.get('content-type') ?? ''
    const corps = await reponse.arrayBuffer()
    if (reponse.status !== 200) return rate(nom, `statut ${reponse.status} pour ${source}`)
    if (!type.startsWith('image/')) return rate(nom, `content-type ${type}`)
    if (corps.byteLength === 0) return rate(nom, 'image vide')
    ok(nom)
  } catch (erreur) {
    rate(nom, String(erreur))
  }
}

async function verifierEntetes() {
  const nom = 'entetes de securite sur /'
  try {
    const reponse = await demander('/')
    await reponse.arrayBuffer()
    const csp = reponse.headers.get('content-security-policy') ?? ''
    if (!csp.includes("frame-ancestors 'none'")) return rate(nom, `CSP publique absente ou incomplete : ${csp || '(vide)'}`)
    if (reponse.headers.get('x-frame-options') !== 'DENY') return rate(nom, 'X-Frame-Options absent')
    if (reponse.headers.get('x-content-type-options') !== 'nosniff') return rate(nom, 'X-Content-Type-Options absent')
    ok(nom)
  } catch (erreur) {
    rate(nom, String(erreur))
  }
}

async function verifierAdmin() {
  const nom = 'admin /admin'
  try {
    // Sans session, l'admin renvoie vers la connexion (ou vers la creation du
    // premier utilisateur sur une base vide) ; il ne doit jamais planter.
    const reponse = await demander('/admin')
    await reponse.arrayBuffer()
    const redirection = reponse.headers.get('location') ?? ''
    if (reponse.status >= 300 && reponse.status < 400) {
      if (!redirection.includes('/admin/')) return rate(nom, `redirige vers ${redirection}`)
    } else if (reponse.status !== 200) {
      return rate(nom, `statut ${reponse.status}`)
    }
    ok(nom)
  } catch (erreur) {
    rate(nom, String(erreur))
  }

  await verifierPage('/admin/login')

  const nomCsp = 'entetes de securite sur /admin/login'
  try {
    const reponse = await demander('/admin/login')
    await reponse.arrayBuffer()
    const csp = reponse.headers.get('content-security-policy') ?? ''
    if (!csp.includes("frame-ancestors 'self'")) return rate(nomCsp, `CSP admin attendue, obtenu : ${csp || '(vide)'}`)
    ok(nomCsp)
  } catch (erreur) {
    rate(nomCsp, String(erreur))
  }
}

async function attendreLeServeur() {
  const limite = Date.now() + DELAI_DEMARRAGE
  while (Date.now() < limite) {
    try {
      const reponse = await fetch(`${BASE}/robots.txt`)
      await reponse.arrayBuffer()
      if (reponse.ok) return
    } catch {
      // pas encore pret
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`le serveur ne repond pas sur ${BASE} apres ${DELAI_DEMARRAGE / 1000} s`)
}

function demarrer(): ChildProcess {
  const commande = MODE_DEV ? 'dev' : 'start'
  console.log(`\n  next ${commande} sur ${BASE}\n`)
  // Une seule chaine : avec `shell: true`, Node refuse desormais un tableau d'arguments.
  const enfant = spawn(`pnpm exec next ${commande} -p ${PORT}`, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT), PAYLOAD_DB_PUSH: 'false' },
  })
  const relayer = (morceau: Buffer) => {
    const texte = morceau.toString()
    // Le bruit de demarrage n'interesse personne, les erreurs si.
    if (/error|warn|⨯/i.test(texte)) process.stderr.write(texte)
  }
  enfant.stdout?.on('data', relayer)
  enfant.stderr?.on('data', relayer)
  return enfant
}

function arreter(enfant: ChildProcess) {
  if (enfant.pid === undefined) return
  if (process.platform === 'win32') {
    // `shell: true` intercale cmd.exe : il faut couper tout l'arbre.
    spawnSync('taskkill', ['/pid', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    enfant.kill('SIGTERM')
  }
}

async function main() {
  const serveur = demarrer()
  try {
    await attendreLeServeur()

    for (const chemin of PAGES) await verifierPage(chemin)
    await verifierPage('/cette-page-n-existe-pas', 404)
    await verifierEntetes()

    for (const [chemin, type] of FICHIERS) await verifierFichier(chemin, type)

    const reponses: Record<string, unknown> = {}
    for (const chemin of APIS) reponses[chemin] = await verifierApi(chemin)

    // Les routes a segment dynamique, avec un vrai identifiant de saison.
    const saison = premierId(reponses['/api/public/seasons'])
    if (saison === undefined) {
      rate('api /api/public/matches/[saison]', 'aucune saison dans /api/public/seasons')
    } else {
      await verifierApi(`/api/public/matches/${saison}`)
      await verifierApi(`/api/public/rankings/${saison}`)
    }

    // Le proxy d'images : un fichier de public/, puis un media Payload, dont
    // l'adresse porte une query string quand il est heberge sur Vercel Blob.
    await verifierImage('/assets/images/webp/placeholder.webp', 'image statique via /_next/image')
    const media = premierMediaLocal(reponses['/api/public/sponsors']) ?? premierMediaLocal(reponses['/api/public/joueurs-with-stats'])
    if (media) {
      await verifierImage(media, 'media Payload via /_next/image')
    } else {
      console.log('--    media Payload via /_next/image (aucun media local dans les reponses, ignore)')
    }

    await verifierAdmin()
  } catch (erreur) {
    rate('demarrage', String(erreur))
  } finally {
    arreter(serveur)
  }

  console.log(echecs === 0 ? '\nLe site repond sur toutes les adresses' : `\n${echecs} adresse(s) en echec`)
  process.exit(echecs === 0 ? 0 : 1)
}

main()
