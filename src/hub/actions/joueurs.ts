"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { chargerFeuilleStats, chargerFiche, listerEffectif, postesDe, type FeuilleStats, type JoueurFiche } from "@/hub/joueurs/donnees";
import { nettoyerSelonPoste, schemaJoueur } from "@/hub/joueurs/fiche";
import { refusNumero, schemaFeuilleStats, surLaFeuille, versTableauxMatch } from "@/hub/joueurs/schema";
import { exigerModule } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les actions du module Joueurs. Elles ecrivent dans deux collections du
 * site, Matchs et Joueurs, qui n'ont pas de regle par personne dans le Hub :
 * le droit est celui du module, en edition, verifie ici, et l'ecriture se
 * fait ensuite en systeme. Sur un match, seuls les deux tableaux de
 * statistiques sont touches.
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

/**
 * Une fiche de la collection Joueurs, creee ou modifiee depuis le Hub. La
 * regle des maillots, deux porteurs par numero et les numeros du poste, se
 * juge sur l'effectif actif tel qu'il est en base, la fiche elle-meme mise
 * a part. Le staff n'a ni numero de feuille ni brassard.
 */
export async function enregistrerJoueur(saisie: unknown): Promise<Resultat<JoueurFiche>> {
  await exigerModule("players", "edit");
  const lecture = schemaJoueur.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = nettoyerSelonPoste(lecture.data);

  if (s.id && !(await chargerFiche(s.id))) return { ok: false, erreur: "Cette fiche n'existe pas." };

  if (s.actif && (s.poste === null || surLaFeuille(s.poste))) {
    const effectif = await listerEffectif();
    const moi = { id: s.id ?? 0, prenom: s.prenom, nom: s.nom, gardien: s.poste === "Gardien", numeroFeuille1: s.numeroFeuille1, numeroFeuille2: s.numeroFeuille2 };
    const autres = effectif.filter((j) => j.actif && j.surFeuille && j.id !== moi.id);
    const refus =
      refusNumero([...autres, moi], moi.id, "numeroFeuille1", s.numeroFeuille1) ??
      refusNumero([...autres, moi], moi.id, "numeroFeuille2", s.numeroFeuille2);
    if (refus) return { ok: false, erreur: refus };
  }

  const donnees = {
    prenom: s.prenom,
    nom: s.nom,
    poste: s.poste,
    numero: s.numero,
    numero_feuille_1: s.numeroFeuille1,
    numero_feuille_2: s.numeroFeuille2,
    // Midi UTC : le meme jour partout, quel que soit le fuseau qui relit.
    date_naissance: s.dateNaissance ? `${s.dateNaissance}T12:00:00.000Z` : null,
    capitaine: s.capitaine,
    actif: s.actif,
    photo: s.photoId,
  };

  const payload = await getPayloadClient();
  try {
    const doc = s.id
      ? await payload.update({ collection: "players", id: s.id, data: donnees, depth: 0 })
      : await payload.create({ collection: "players", data: donnees, depth: 0 });
    revalidatePath("/hub/joueurs/effectif");
    revalidatePath("/hub/joueurs/stats");
    const fiche = await chargerFiche(Number(doc.id));
    return fiche ? { ok: true, donnees: fiche } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}
