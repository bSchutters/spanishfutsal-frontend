import type { Access, Field, FieldAccess } from 'payload'

/**
 * Les collections dont l'acces se regle personne par personne, depuis la fiche
 * utilisateur. L'ordre est celui des blocs dans l'administration.
 *
 * Trois collections restent volontairement hors de cette liste, reservees aux
 * administrateurs : les utilisateurs (donner des droits est le geste qu'on ne
 * delegue pas), les parametres (ils portent le token LFFS) et le journal des
 * imports (une trace technique, pas du contenu).
 */
export const MANAGED_COLLECTIONS = [
  { slug: 'matches', label: 'Matchs' },
  { slug: 'players', label: 'Joueurs' },
  { slug: 'teams', label: 'Equipes' },
  { slug: 'media', label: 'Medias' },
  { slug: 'sponsors', label: 'Sponsors' },
  { slug: 'rankings', label: 'Classements' },
  { slug: 'seasons', label: 'Saisons' },
  { slug: 'venues', label: 'Salles' },
] as const

export type ManagedSlug = (typeof MANAGED_COLLECTIONS)[number]['slug']

/**
 * `edit` permet de creer et de modifier, `full` ajoute la suppression.
 * Un niveau absent vaut `none` : un compte cree sans reglage n'a acces a rien.
 */
export type PermissionLevel = 'none' | 'edit' | 'full'

export const PERMISSION_OPTIONS = [
  { label: 'Aucun acces', value: 'none' },
  { label: 'Creer et modifier', value: 'edit' },
  { label: 'Tout gerer, suppression comprise', value: 'full' },
]

/** Nom du sous-groupe qui porte les cases d'une collection sur la fiche utilisateur. */
export const fieldsGroupName = (slug: ManagedSlug) => `${slug}_fields` as const

export type PermissionableField = { name: string; label: string }

const prettify = (name: string) => {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Un champ se regle s'il porte un nom et se saisit a la main. On ecarte donc :
 *
 * - les elements de presentation (lignes, onglets, blocs repliables), sans nom ;
 * - les champs en lecture seule, remplis par l'import de la federation ;
 * - les champs masques, calcules a l'enregistrement ou restes d'une version
 *   precedente.
 *
 * Cette lecture se fait sur la configuration reelle des collections, pas sur une
 * liste recopiee : un champ ajoute a une collection apparait tout seul dans la
 * fiche utilisateur, et un champ supprime en disparait.
 */
const isSettable = (field: Field): field is Field & { name: string } => {
  if (!('name' in field) || typeof field.name !== 'string') return false
  // `admin` n'a pas la meme forme selon le type de champ : tous n'exposent pas
  // `readOnly` ni `hidden`, d'ou cette lecture volontairement permissive.
  const admin = ('admin' in field ? field.admin : undefined) as
    | { readOnly?: boolean; hidden?: boolean }
    | undefined
  if (admin?.readOnly === true) return false
  if (admin?.hidden === true) return false
  return true
}

const labelOf = (field: Field, name: string): string => {
  const label = 'label' in field ? field.label : undefined
  if (typeof label === 'string' && label.length > 0) return label
  if (label && typeof label === 'object') {
    const fr = (label as Record<string, unknown>).fr
    if (typeof fr === 'string' && fr.length > 0) return fr
  }
  return prettify(name)
}

/** La liste des champs reglables d'une collection, dans l'ordre du formulaire. */
export const permissionableFields = (fields: Field[]): PermissionableField[] =>
  fields.filter(isSettable).map((field) => ({ name: field.name, label: labelOf(field, field.name) }))

/**
 * `payload-types.ts` n'est pas genere dans ce projet, d'ou cette forme minimale
 * decrivant ce qu'on lit reellement sur l'utilisateur.
 */
type PermissionsShape = Partial<Record<ManagedSlug, PermissionLevel | null>> &
  Partial<Record<`${ManagedSlug}_fields`, Record<string, boolean | null> | null>>

type UserWithPermissions = {
  role?: string | null
  permissions?: PermissionsShape | null
}

const asAccount = (user: unknown) => user as UserWithPermissions | null | undefined

const levelFor = (user: unknown, slug: ManagedSlug): PermissionLevel => {
  const account = asAccount(user)
  if (!account) return 'none'
  // Un administrateur passe partout, sa fiche ne porte aucun reglage.
  if (account.role === 'admin') return 'full'
  return account.permissions?.[slug] ?? 'none'
}

/** Creer et modifier : accorde des le niveau `edit`. */
export const canWrite =
  (slug: ManagedSlug): Access =>
  ({ req: { user } }) =>
    levelFor(user, slug) !== 'none'

/** Supprimer : reserve au niveau `full`. */
export const canDelete =
  (slug: ManagedSlug): Access =>
  ({ req: { user } }) =>
    levelFor(user, slug) === 'full'

/**
 * Retire l'entree du menu quand la personne n'a aucun droit dessus. La lecture
 * reste publique par ailleurs, c'est le site qui en depend ; ce reglage range
 * le menu, il ne remplace pas les regles d'ecriture ci-dessus.
 */
export const isHidden =
  (slug: ManagedSlug) =>
  ({ user }: { user?: unknown }) =>
    levelFor(user, slug) === 'none'

/**
 * Droit sur un champ precis. Une case decochee rend le champ non modifiable :
 * Payload le grise dans le formulaire et l'ecarte des ecritures par l'API.
 *
 * Une case jamais renseignee vaut autorise. Donner acces a une collection ouvre
 * donc tous ses champs, et on decoche ensuite les exceptions ; c'est aussi ce
 * qui fait qu'un champ ajoute plus tard ne bloque personne en attendant qu'un
 * administrateur passe sur les fiches.
 */
export const canEditField =
  (slug: ManagedSlug, field: string): FieldAccess =>
  ({ req: { user } }) => {
    const account = asAccount(user)
    if (!account) return false
    if (account.role === 'admin') return true
    if (levelFor(user, slug) === 'none') return false
    return account.permissions?.[fieldsGroupName(slug)]?.[field] !== false
  }

/**
 * Pose les droits sur chaque champ reglable d'une collection, sans avoir a les
 * ecrire dans chaque definition de champ. Les champs ecartes par `isSettable`
 * passent intacts.
 *
 * `create` recoit la meme regle que `update` : sans lui, un champ decoche
 * resterait saisissable au moment de creer la fiche, puisque Payload autorise
 * par defaut ce qui n'est pas declare. Une case decochee veut dire "cette
 * personne ne renseigne pas ce champ", a la creation comme a la modification.
 *
 * `read` reste volontairement ouvert : le site publie deja ces donnees, masquer
 * dans l'administration ce que le premier visiteur venu lit sur la page
 * d'accueil n'apporterait rien.
 */
export const withFieldPermissions = (slug: ManagedSlug, fields: Field[]): Field[] =>
  fields.map((field) => {
    if (!isSettable(field)) return field
    const existing = 'access' in field ? field.access : undefined
    const rule = canEditField(slug, field.name)
    return {
      ...field,
      access: { ...existing, create: rule, update: rule },
    } as Field
  })

export const isAdmin: Access = ({ req: { user } }) => {
  return asAccount(user)?.role === 'admin'
}

export const isAdminField: FieldAccess = ({ req: { user } }) => {
  return asAccount(user)?.role === 'admin'
}
