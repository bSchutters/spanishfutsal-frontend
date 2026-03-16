import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { importMatches } from '@/lib/lffs/import-matches'
import { importRankings } from '@/lib/lffs/import-rankings'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s on Vercel

/**
 * Import trigger endpoint.
 * Called by:
 * - Vercel Cron (daily)
 * - External cron service (every 30min on match evenings)
 * - Admin button (manual trigger)
 *
 * Security: requires CRON_SECRET header or authenticated admin user
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Check for cron secret (for external cron services)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return runImport()
  }

  // Check for authenticated Payload user (admin only)
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })

    if (user?.role === 'admin') {
      return runImport()
    }
  } catch {
    // Auth failed, continue to rejection
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Also support GET for Vercel Cron (which sends GET requests)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return runImport()
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function runImport() {
  try {
    const payload = await getPayloadClient()

    // Check if auto-import is enabled
    const settings = await payload.findGlobal({ slug: 'settings' })
    if (!settings.imports) {
      return NextResponse.json({
        success: true,
        message: 'Auto-import disabled in settings',
      })
    }

    console.log('Starting LFFS import...')
    const [rankingsResult, matchesResult] = await Promise.all([
      importRankings(payload),
      importMatches(payload),
    ])

    return NextResponse.json({
      success: true,
      rankings: rankingsResult,
      matches: matchesResult,
    })
  } catch (error) {
    console.error('Import trigger error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
