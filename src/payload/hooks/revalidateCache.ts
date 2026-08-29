import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

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

export function revalidateGlobalAfterChange(tags: string[]): GlobalAfterChangeHook {
  return ({ doc }) => {
    revalidateTags(tags)
    return doc
  }
}
