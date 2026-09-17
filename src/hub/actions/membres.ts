"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { chargerMembre, type Membre } from "@/hub/membres/donnees";
import { nettoyerSelonAcces, schemaDroitsMembre, versLignesModules } from "@/hub/membres/schema";
import { exigerAdmin } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les droits d'un compte sur le Hub, regles depuis le Hub lui-meme. Reserve
 * aux administrateurs, ici comme dans la collection : l'ecriture se fait avec
 * leurs droits, `overrideAccess: false`, donc les regles de Users et de ses
 * champs s'appliquent une seconde fois. Seuls l'acces, les modules et les
 * flux autorises sont touches ; le role, le mot de passe et les rappels que
 * la personne a choisis restent hors de portee.
 */

const premiereErreur = (erreur: z.core.$ZodError) => erreur.issues[0]?.message ?? "Vérifiez votre saisie.";

function messageDe(erreur: unknown): string {
  if (erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string") {
    return erreur.message;
  }
  return "L'enregistrement a échoué.";
}

export async function enregistrerDroitsMembre(saisie: unknown): Promise<Resultat<Membre>> {
  const { user } = await exigerAdmin();
  const lecture = schemaDroitsMembre.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = nettoyerSelonAcces(lecture.data);

  const existant = await chargerMembre(user, s.id);
  if (!existant) return { ok: false, erreur: "Ce compte n'existe pas." };
  // Un administrateur a tout sans reglage : lui poser des droits n'aurait
  // aucun effet, et laisserait croire le contraire.
  if (existant.administrateur) return { ok: false, erreur: "Un administrateur a déjà accès à tout." };

  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "users",
      id: s.id,
      data: { hub: { access: s.acces, modules: versLignesModules(s.niveaux), feeds: s.fluxIds } },
      depth: 0,
      overrideAccess: false,
      user,
    });
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }

  revalidatePath("/hub/membres");
  const relu = await chargerMembre(user, s.id);
  return relu ? { ok: true, donnees: relu } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
}
