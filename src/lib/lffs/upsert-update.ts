import type { Payload } from 'payload'

export async function upsertLffsUpdate(
  payload: Payload,
  type: 'ranking' | 'matches',
  options: { status?: string; error_message?: string; items_processed?: number }
) {
  const { status = 'success', error_message, items_processed } = options

  const existing = await payload.find({
    collection: 'lffs-updates',
    where: { type: { equals: type } },
    limit: 1,
  })

  const updateData: Record<string, unknown> = {
    type,
    last_update: new Date().toISOString(),
    status,
    error_message: error_message || null,
    items_processed: items_processed ?? null,
  }

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'lffs-updates',
      id: existing.docs[0].id,
      data: updateData,
    })
  } else {
    await payload.create({
      collection: 'lffs-updates',
      data: updateData,
    })
  }
}
