import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

function revalidateTags(tags: string[]) {
  for (const tag of tags) {
    // Next 16 exige un profil de duree de cache en second argument ; 'max'
    // invalide l'entree completement, comme l'ancien appel a un argument.
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
