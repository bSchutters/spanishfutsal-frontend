"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { chargerFeuilleStats, postesDe, type FeuilleStats, type JoueurFeuille } from "@/hub/joueurs/donnees";
import { schemaFeuilleStats, schemaNumeros, versTableauxMatch } from "@/hub/joueurs/schema";
import { exigerModule } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les actions du module Joueurs. Elles ecrivent dans deux collections du
 * site, Matchs et Joueurs, qui n'ont pas de regle par personne dans le Hub :
 * le droit est celui du module, en edition, verifie ici, et l'ecriture se
 * fait ensuite en systeme, limitee aux seuls champs de statistiques et de
 * numeros. Le reste d'un match ou d'un joueur n'est jamais touche.
 */

const premiereErreur = (erreur: z.core.$ZodError) => erreur.issues[0]?.message ?? "Vérifiez votre saisie.";

function messageDe(erreur: unknown): string {
  if (erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string") {
    return erreur.message;
  }
  return "L'enregistrement a échoué.";
}

const MATCH_INTROUVABLE = "Ce match n'est pas dans la saison en cours.";

/** La feuille entiere d'un match : les lignes recues remplacent celles en base. */
export async function enregistrerFeuilleStats(saisie: unknown): Promise<Resultat<FeuilleStats>> {
  await exigerModule("players", "edit");
  const lecture = schemaFeuilleStats.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const { matchId, lignes } = lecture.data;

  const feuille = await chargerFeuilleStats(matchId);
  if (!feuille) return { ok: false, erreur: MATCH_INTROUVABLE };

  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "matches",
      id: matchId,
      data: versTableauxMatch(lignes, postesDe(feuille.joueurs)),
      depth: 0,
    });
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }

  revalidatePath("/hub/joueurs/stats");
  revalidatePath(`/hub/joueurs/stats/${matchId}`);
  const relue = await chargerFeuilleStats(matchId);
  return relue ? { ok: true, donnees: relue } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
}

/** Les deux numeros de feuille de match d'un joueur. Vide efface. Le numero du site n'est pas touche. */
export async function enregistrerNumeros(saisie: unknown): Promise<Resultat<JoueurFeuille>> {
  await exigerModule("players", "edit");
  const lecture = schemaNumeros.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const { joueurId, numero, numero2 } = lecture.data;

  const payload = await getPayloadClient();
  try {
    const doc = await payload.update({
      collection: "players",
      id: joueurId,
      data: { numero_feuille_1: numero, numero_feuille_2: numero2 },
      depth: 0,
    });
    revalidatePath("/hub/joueurs/numeros");
    const poste = (doc.poste as JoueurFeuille["poste"] | null | undefined) ?? null;
    return {
      ok: true,
      donnees: {
        id: Number(doc.id),
        prenom: String(doc.prenom ?? ""),
        nom: String(doc.nom ?? ""),
        numeroFeuille1: typeof doc.numero_feuille_1 === "number" ? doc.numero_feuille_1 : null,
        numeroFeuille2: typeof doc.numero_feuille_2 === "number" ? doc.numero_feuille_2 : null,
        poste,
        gardien: poste === "Gardien",
        capitaine: doc.capitaine === true,
      },
    };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}
