/**
 * Get LFFS access token.
 *
 * The token is embedded in the LFFS website HTML as `bpleagues_api_key`.
 * We fetch the page and extract it — no headless browser needed.
 *
 * Fallback: manual token from Payload Settings.
 */

let cachedToken: string | null = null
let cachedAt = 0
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function getLffsToken(options?: {
  forceRefresh?: boolean
  manualToken?: string | null
}): Promise<string> {
  const { forceRefresh, manualToken } = options || {}

  // If a manual token is provided in settings, use it directly
  if (manualToken) {
    return manualToken
  }

  // Check cache
  const now = Date.now()
  if (!forceRefresh && cachedToken && now - cachedAt < TOKEN_TTL_MS) {
    return cachedToken
  }

  // Extract token from LFFS page
  const token = await extractTokenFromLffs()

  if (token) {
    cachedToken = token
    cachedAt = Date.now()
    console.log('LFFS token obtained successfully')
    return token
  }

  // If we have a stale cached token, use it as fallback
  if (cachedToken) {
    console.warn('Using stale cached token as fallback')
    return cachedToken
  }

  throw new Error(
    'Unable to obtain LFFS token. Set it manually in admin Settings > Token LFFS.'
  )
}

async function extractTokenFromLffs(): Promise<string | null> {
  try {
    console.log('Fetching LFFS token from website...')

    const response = await fetch(
      'https://www.lffs.eu/competitions-bruxelles-brabant-wallon/?season_id=9&organization_id=1&serie_id=1272',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    )

    if (!response.ok) {
      console.warn(`LFFS page returned ${response.status}`)
      return null
    }

    const html = await response.text()

    // Extract bpleagues_api_key from the page
    const match = html.match(/bpleagues_api_key["']?\s*:\s*["']([^"']+)["']/)
    if (match?.[1]) {
      console.log('Token extracted from bpleagues_api_key')
      return match[1]
    }

    // Fallback: look for WP_Access pattern
    const wpMatch = html.match(/WP_Access\s+([a-zA-Z0-9._+/=-]+)/)
    if (wpMatch?.[1]) {
      console.log('Token extracted from WP_Access pattern')
      return wpMatch[1]
    }

    console.warn('Could not find token in LFFS page')
    return null
  } catch (error) {
    console.error('Error fetching LFFS token:', error)
    return null
  }
}
