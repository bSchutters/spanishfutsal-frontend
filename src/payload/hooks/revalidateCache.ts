import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

function revalidateTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag)
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
