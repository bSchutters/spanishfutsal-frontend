import { formaterDateNumerique, formaterDateSansAnnee, formaterHeure } from "@/hub/dates";
import type { ChampsMatch } from "./construction";

/**
 * Les variables des modeles de post, entre accolades dans les titres, les
 * legendes et les instructions : `{adversaire}`, `{date}`, `{heure}`...
 * La liste est celle du cahier ; l'admin des modeles la rappelle.
 */

export type Variables = Record<string, string>;

export const NOMS_VARIABLES = [
  "adversaire",
  "date",
  "date_courte",
  "heure",
  "heure_rdv",
  "salle",
  "adresse",
  "domicile_exterieur",
  "competition",
  "score",
  "lien_live",
  "lien_replay",
] as const;

export function variablesDe(
  champs: ChampsMatch,
  extras: { heureRdv: string | null; lienLive: string | null | undefined; lienReplay: string | null | undefined },
): Variables {
  return {
    adversaire: champs.opponent,
    date: formaterDateSansAnnee(champs.starts_at),
    date_courte: formaterDateNumerique(champs.starts_at),
    heure: champs.all_day ? "" : formaterHeure(champs.starts_at),
    heure_rdv: extras.heureRdv ? formaterHeure(extras.heureRdv) : "",
    salle: champs.location_name ?? "",
    adresse: champs.location_address ?? "",
    domicile_exterieur: champs.home ? "à domicile" : "à l'extérieur",
    competition: champs.competition ?? "",
    score: champs.score ?? "",
    lien_live: extras.lienLive?.trim() ?? "",
    lien_replay: extras.lienReplay?.trim() ?? "",
  };
}

/** Remplace chaque variable connue ; une accolade inconnue reste telle quelle. */
export function rendreTexte(modele: string | null | undefined, variables: Variables): string {
  if (!modele) return "";
  return modele.replace(/\{([a-z_]+)\}/g, (tout, nom: string) => (nom in variables ? variables[nom] : tout));
}

/**
 * Le meme remplacement dans un etat Lexical : seuls les noeuds de texte
 * changent, la mise en forme reste. Rend une copie, jamais l'original.
 */
export function rendreLexical(etat: unknown, variables: Variables): unknown {
  if (etat === null || etat === undefined) return null;
  const visiter = (noeud: unknown): unknown => {
    if (Array.isArray(noeud)) return noeud.map(visiter);
    if (!noeud || typeof noeud !== "object") return noeud;
    const copie: Record<string, unknown> = {};
    for (const [cle, valeur] of Object.entries(noeud as Record<string, unknown>)) {
      copie[cle] =
        cle === "text" && typeof valeur === "string" && (noeud as { type?: unknown }).type === "text"
          ? rendreTexte(valeur, variables)
          : visiter(valeur);
    }
    return copie;
  };
  return visiter(etat);
}
