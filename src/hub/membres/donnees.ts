import type { UtilisateurSession } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";
import { membreDe, nomDuMembre, type Doc, type FluxChoix, type Membre } from "./schema";

export { membreDe, nomDuMembre, type FluxChoix, type Membre };

/**
 * La lecture des comptes et de leurs droits sur le Hub, reservee aux
 * administrateurs : la collection Users ne laisse un manager voir que sa
 * propre fiche, et c'est cette regle qui s'applique ici aussi, la lecture se
 * faisant avec les droits de la personne.
 */


/** Tous les comptes, les administrateurs en tete, puis par nom. */
export async function listerMembres(user: UtilisateurSession): Promise<Membre[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "users",
    limit: 200,
    depth: 0,
    sort: "email",
    overrideAccess: false,
    user,
  });
  return (docs as Doc[])
    .map(membreDe)
    .sort(
      (a, b) =>
        Number(b.administrateur) - Number(a.administrateur) ||
        nomDuMembre(a).localeCompare(nomDuMembre(b), "fr"),
    );
}

/** Une fiche de membre, relue apres ecriture. */
export async function chargerMembre(user: UtilisateurSession, id: number): Promise<Membre | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "users",
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  });
  const doc = docs[0] as Doc | undefined;
  return doc ? membreDe(doc) : null;
}

/** Les flux du club, pour cocher ceux qu'une personne peut voir. */
export async function listerFlux(user: UtilisateurSession): Promise<FluxChoix[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({ collection: "feeds", sort: "order", limit: 50, depth: 0, overrideAccess: false, user });
  return docs.map((f) => ({ id: Number(f.id), nom: String(f.name ?? ""), couleur: typeof f.color === "string" ? f.color : null }));
}
