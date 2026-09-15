/**
 * Ce que toutes les collections du Hub ont en commun dans l'administration :
 * rangees sous un meme groupe, et retirees du menu des non-administrateurs.
 * Ils passent par le Hub, pas par l'administration.
 *
 * `user` est laisse sans type : Payload ne genere pas de types dans ce projet,
 * et la forme attendue differe entre collections et globaux.
 */
const estAdmin = (user: unknown) => (user as { role?: string | null } | null | undefined)?.role === 'admin'

export const adminHub = {
  group: 'Hub',
  hidden: ({ user }: { user?: unknown }) => !estAdmin(user),
}

export const adminGlobalHub = {
  group: 'Hub',
  hidden: ({ user }: { user?: unknown }) => !estAdmin(user),
}

/** Une couleur au format #rrggbb, ou rien. */
export const validerCouleur = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  return /^#[0-9a-f]{6}$/i.test(String(value)) || 'Format attendu : #rrggbb, par exemple #a2d6f8'
}

/** Un slug : lettres minuscules, chiffres et tirets. */
export const validerSlug = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0) return 'Le slug est obligatoire'
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ||
    'Lettres minuscules, chiffres et tirets uniquement, par exemple pole-social'
  )
}

/** Une heure au format HH:mm, ou rien. */
export const validerHeure = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || 'Format attendu : HH:mm, par exemple 18:00'
}

/** Les reglages d'un champ date avec heure, en 24 h. */
export const dateEtHeure = {
  date: {
    pickerAppearance: 'dayAndTime' as const,
    displayFormat: 'd MMM yyyy HH:mm',
    timeFormat: 'HH:mm',
  },
}
