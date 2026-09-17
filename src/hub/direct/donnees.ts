import { getPayloadClient } from "@/lib/payload";
import type { DetailDiffusion, Diffusion } from "./schema";

export { evolution, precedente } from "./schema";
export type { DetailDiffusion, Diffusion };

/**
 * La lecture du module Direct : les rapports d'audience des diffusions.
 *
 * Rien ne s'y ecrit. Les chiffres sont produits par le site lui-meme a la fin
 * de chaque diffusion, dans la collection `live-reports` ; le Hub ne fait que
 * les relire. Le droit d'acceder au module est verifie par la page, la lecture
 * se fait ensuite en systeme, cette collection ne portant pas de regle par
 * personne.
 */

type FicheBrute = {
  id: number;
  match?: number | { id: number } | null;
  affiche?: string | null;
  debut?: string | null;
  fin?: string | null;
  uniques?: number | null;
  pointe?: number | null;
  duree_moyenne?: number | null;
  part_mobile?: number | null;
  courbe?: unknown;
  details?: unknown;
};

function nombre(valeur: unknown): number {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : 0;
}

function convertir(fiche: FicheBrute): Diffusion {
  const match = fiche.match;

  return {
    id: fiche.id,
    matchId: typeof match === "object" && match ? match.id : (match ?? null),
    affiche: fiche.affiche ?? "Diffusion",
    debut: fiche.debut ?? null,
    fin: fiche.fin ?? null,
    uniques: nombre(fiche.uniques),
    pointe: nombre(fiche.pointe),
    dureeMoyenne: nombre(fiche.duree_moyenne),
    partMobile: nombre(fiche.part_mobile),
    courbe: Array.isArray(fiche.courbe) ? (fiche.courbe as number[]) : [],
    detail: (fiche.details as DetailDiffusion) ?? {},
  };
}

/**
 * Les diffusions, de la plus recente a la plus ancienne.
 *
 * Le match d'essai est ecarte : son rapport existe pour eprouver la chaine de
 * bout en bout, il n'a rien a faire dans l'audience du club. Un rapport dont la
 * rencontre a disparu passe, faute de savoir ce qu'il etait.
 */
export async function listerLesDiffusions(): Promise<Diffusion[]> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: "live-reports",
    where: { "match.essai": { not_equals: true } },
    sort: "-debut",
    limit: 200,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  return (docs as unknown as FicheBrute[]).map(convertir);
}
