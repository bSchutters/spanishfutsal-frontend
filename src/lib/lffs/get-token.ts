/**
 * Get LFFS access token.
 *
 * The token is embedded in the LFFS website HTML as `bpleagues_api_key`.
 * We fetch the page and extract it , no headless browser needed.
 *
 * Token is stored in the Payload Settings global to persist across cold starts.
 * Fallback: manual token from Settings.
 */

import type { Payload } from 'payload'

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function getLffsToken(options?: {
  forceRefresh?: boolean
  manualToken?: string | null
  payload?: Payload
}): Promise<string> {
  const { forceRefresh, manualToken, payload } = options || {}

  // If a manual token is provided in settings, use it directly
  if (manualToken) {
    return manualToken
  }

  // Check DB-stored token (persists across cold starts)
  if (!forceRefresh && payload) {
    try {
      const settings = await payload.findGlobal({ slug: 'settings' })
      const cachedToken = (settings as Record<string, unknown>).cached_lffs_token as string | undefined
      const cachedAt = (settings as Record<string, unknown>).cached_lffs_token_at as string | undefined
      if (cachedToken && cachedAt) {
        const age = Date.now() - new Date(cachedAt).getTime()
        if (age < TOKEN_TTL_MS) {
          return cachedToken
        }
      }
    } catch {
      // Settings not available, continue to fetch
    }
  }

  // Extract token from LFFS page
  const token = await extractTokenFromLffs()

  if (token && payload) {
    // Store in DB for persistence across cold starts
    try {
      await payload.updateGlobal({
        slug: 'settings',
        data: {
          cached_lffs_token: token,
          cached_lffs_token_at: new Date().toISOString(),
        } as Record<string, unknown>,
      })
    } catch {
      // Non-critical, continue
    }
    return token
  }

  if (token) return token

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
