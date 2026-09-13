import type { CollectionConfig } from 'payload'

import { MANAGED_COLLECTIONS, permissionableFields, type ManagedSlug } from './access'
import { Matches } from './collections/Matches'
import { Media } from './collections/Media'
import { Players } from './collections/Players'
import { Rankings } from './collections/Rankings'
import { Seasons } from './collections/Seasons'
import { Sponsors } from './collections/Sponsors'
import { Teams } from './collections/Teams'
import { Venues } from './collections/Venues'

/**
 * Relie chaque slot de `MANAGED_COLLECTIONS` a sa configuration reelle.
 *
 * Ce fichier existe pour eviter un cycle d'imports : les collections importent
 * `access.ts`, la fiche utilisateur a besoin de leurs champs, et `access.ts` ne
 * doit donc rien importer d'elles. Le registre s'intercale entre les deux.
 *
 * `Record<ManagedSlug, ...>` oblige a completer ce tableau des qu'une entree
 * arrive dans `MANAGED_COLLECTIONS` : l'oubli devient une erreur de typage.
 */
const CONFIGS: Record<ManagedSlug, CollectionConfig> = {
  matches: Matches,
  players: Players,
  teams: Teams,
  media: Media,
  sponsors: Sponsors,
  rankings: Rankings,
  seasons: Seasons,
  venues: Venues,
}

/**
 * Les collections reglables, chacune avec la liste de ses champs modifiables
 * telle qu'elle est reellement declaree. Ajouter un champ a une collection
 * suffit a le voir apparaitre dans la fiche utilisateur.
 */
export const MANAGED = MANAGED_COLLECTIONS.map(({ slug, label }) => ({
  slug,
  label,
  fields: permissionableFields(CONFIGS[slug].fields),
}))
