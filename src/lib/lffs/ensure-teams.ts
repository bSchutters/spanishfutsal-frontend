import type { Payload } from 'payload'
import { normalizeTeamKey } from '@/lib/teams'

/**
 * Registers any LFFS team name that has no `teams` entry yet. Cup opponents
 * show up mid-season, so the import creates a placeholder using the raw name
 * and the admin only has to set the public name and the logo afterwards.
 */
export async function ensureTeams(payload: Payload, rawNames: string[]): Promise<number> {
  const incoming = new Map<string, string>()
  for (const raw of rawNames) {
    const name = raw?.trim()
    if (name) incoming.set(normalizeTeamKey(name), name)
  }
  if (incoming.size === 0) return 0

  const existing = await payload.find({ collection: 'teams', limit: 500, depth: 0 })
  for (const team of existing.docs) {
    for (const lffsName of team.lffs_names ?? []) {
      if (lffsName) incoming.delete(normalizeTeamKey(lffsName))
    }
    incoming.delete(normalizeTeamKey(team.name))
  }

  let created = 0
  for (const name of incoming.values()) {
    await payload.create({
      collection: 'teams',
      data: { lffs_names: [name], name },
    })
    created++
  }

  if (created > 0) console.log(`Teams created from LFFS import: ${created}`)
  return created
}
