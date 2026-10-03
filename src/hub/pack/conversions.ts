import { versChampDate } from "@/hub/dates";
import { STATUTS_COMMANDE, type Article, type Commande, type LigneCommande, type StatutCommande, type Variante } from "./schema";

/**
 * Les documents Payload du Pack traduits dans les formes du module. Pures,
 * sans Payload : un composant client ou un test peut les importer.
 */

type Doc = Record<string, unknown> & { id: number | string };

const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const nombre = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : 0);

function photoDe(photo: unknown): Variante["photo"] {
  return photo && typeof photo === "object" && typeof (photo as { url?: unknown }).url === "string"
    ? { id: Number((photo as { id: unknown }).id), url: String((photo as { url: string }).url) }
    : null;
}

export function articleDe(doc: Doc): Article {
  const tailles = Array.isArray(doc.sizes) ? doc.sizes.filter((t): t is string => typeof t === "string" && t.trim() !== "") : [];
  const variantes = Array.isArray(doc.variants) ? (doc.variants as Doc[]) : [];
  return {
    id: Number(doc.id),
    nom: texte(doc.name),
    description: texte(doc.description),
    prix: nombre(doc.price),
    tailles: tailles.map((t) => t.trim()),
    floquable: doc.flockable === true,
    actif: doc.active !== false,
    ordre: nombre(doc.sort_order),
    variantes: variantes.map((v) => ({
      id: String(v.id),
      couleur: texte(v.color),
      reference: texte(v.reference),
      photo: photoDe(v.photo),
    })),
  };
}

function idRelation(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "id" in v) return Number((v as { id: unknown }).id);
  return null;
}

function ligneDe(l: Doc): LigneCommande {
  return {
    id: l.id === undefined || l.id === null ? null : String(l.id),
    articleId: idRelation(l.article),
    varianteId: texte(l.variant_id) || null,
    article: texte(l.article_name),
    couleur: texte(l.color),
    reference: texte(l.reference),
    taille: texte(l.size),
    quantite: nombre(l.quantity) || 1,
    numero: texte(l.flock_number),
    nom: texte(l.flock_name),
    prixUnitaire: nombre(l.unit_price),
  };
}

export function commandeDe(doc: Doc): Commande {
  const joueur = doc.player && typeof doc.player === "object" ? (doc.player as Doc) : null;
  const nomJoueur = joueur ? [texte(joueur.prenom), texte(joueur.nom)].filter(Boolean).join(" ") : "";
  const statut = STATUTS_COMMANDE.includes(doc.status as StatutCommande) ? (doc.status as StatutCommande) : "received";
  return {
    id: Number(doc.id),
    joueurId: idRelation(doc.player),
    personne: nomJoueur || texte(doc.other_name) || "Sans nom",
    autreNom: texte(doc.other_name),
    telephone: texte(doc.phone),
    email: texte(doc.email),
    remarque: texte(doc.note),
    lignes: (Array.isArray(doc.lines) ? (doc.lines as Doc[]) : []).map(ligneDe),
    total: nombre(doc.total),
    statut,
    creeLe: String(doc.createdAt ?? ""),
    commandeeLe: typeof doc.ordered_at === "string" ? versChampDate(doc.ordered_at) || null : null,
  };
}

/** Les lignes dans la forme que la collection range. */
export function versLignesCollection(lignes: readonly LigneCommande[]) {
  return lignes.map((l) => ({
    ...(l.id ? { id: l.id } : {}),
    article: l.articleId,
    variant_id: l.varianteId,
    article_name: l.article,
    color: l.couleur,
    reference: l.reference,
    size: l.taille,
    quantity: l.quantite,
    flock_number: l.numero,
    flock_name: l.nom,
    unit_price: l.prixUnitaire,
  }));
}
