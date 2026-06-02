import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

function revalidateTags(tags: string[]) {
  for (const tag of tags) {
    // Next 16 requires a cache-life profile as 2nd arg; 'max' revalidates fully.
    revalidateTag(tag, 'max')
  }
}

export function revalidateAfterChange(tags: string[]): CollectionAfterChangeHook {
  return ({ doc }) => {
    revalidateTags(tags)
    return doc
  }
}

export function revalidateAfterDelete(tags: string[]): CollectionAfterDeleteHook {
  return ({ doc }) => {
    revalidateTags(tags)
    return doc
  }
}
