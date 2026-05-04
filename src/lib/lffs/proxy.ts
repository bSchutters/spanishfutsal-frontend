/**
 * LFFS data fetcher via the WordPress REST proxy.
 *
 * The LFFS website exposes a WP REST proxy at /wp-json/bpleagues/v1/proxy
 * that forwards requests to gestion.lffs.eu and adds the API token server-side.
 * We just need a WP nonce (extracted from any page) to authenticate.
 */

const LFFS_SITE = 'https://www.lffs.eu'
const PROXY_URL = `${LFFS_SITE}/wp-json/bpleagues/v1/proxy`

let cachedNonce: string | null = null
let nonceTimestamp = 0
const NONCE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours (WP nonce ticks are ~12h)

async function getNonce(): Promise<string> {
  const age = Date.now() - nonceTimestamp
  if (cachedNonce && age < NONCE_TTL_MS) {
    return cachedNonce
  }

  console.log('Fetching WP nonce from lffs.eu...')
  const response = await fetch(LFFS_SITE, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`LFFS site returned ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(/"rest_nonce":"([^"]+)"/)

  if (!match?.[1]) {
    throw new Error('Could not extract WP nonce from LFFS site')
  }

  cachedNonce = match[1]
  nonceTimestamp = Date.now()
  console.log('WP nonce obtained successfully')
  return cachedNonce
}

export async function lffsGet<T = unknown>(path: string, params: Record<string, string> = {}): Promise<T> {
  const nonce = await getNonce()

  const url = new URL(PROXY_URL)
  url.searchParams.set('_path', path)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { 'X-WP-Nonce': nonce },
  })

  if (!response.ok) {
    // If nonce expired, retry once with a fresh nonce
    if (response.status === 403 || response.status === 401) {
      cachedNonce = null
      const freshNonce = await getNonce()
      const retryResponse = await fetch(url.toString(), {
        headers: { 'X-WP-Nonce': freshNonce },
      })
      if (!retryResponse.ok) {
        throw new Error(`LFFS proxy returned ${retryResponse.status} after nonce refresh`)
      }
      return retryResponse.json() as Promise<T>
    }
    throw new Error(`LFFS proxy returned ${response.status}`)
  }

  return response.json() as Promise<T>
}
