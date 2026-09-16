"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { chargerIdee, type IdeeDetail } from "@/hub/idees/donnees";
import { appliquerVote, STATUTS_IDEE, schemaIdee } from "@/hub/idees/schema";
import { exigerModule } from "@/hub/session";
import { texteVersLexical } from "@/hub/texte";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les actions du tableau des idees. Creer, modifier, deplacer et planifier
 * demandent l'edition ; voter et lire sont ouverts des la lecture, le vote
 * s'ecrivant alors avec les droits systeme apres verification.
 */

const identifiant = z.number().check(z.int(), z.positive());
const premiereErreur = (erreur: z.core.$ZodError) => erreur.issues[0]?.message ?? "Vérifiez votre saisie.";

function rafraichir() {
  revalidatePath("/hub/idees");
}

function messageDe(erreur: unknown): string {
  if (erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string") {
    return erreur.message;
  }
  return "L'enregistrement a échoué.";
}

const INTROUVABLE = "Cette idée n'existe pas, ou ne vous est pas ouverte.";

export async function enregistrerIdee(saisie: unknown): Promise<Resultat<IdeeDetail>> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = schemaIdee.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  if (s.id && !(await chargerIdee(user, s.id))) return { ok: false, erreur: INTROUVABLE };

  const donnees = {
    title: s.titre,
    description: texteVersLexical(s.description),
    networks: s.reseauxIds,
    format: s.formatIds,
    inspiration_link: s.lienInspiration || null,
    linked_match: s.matchLieId,
  };

  const payload = await getPayloadClient();
  try {
    const doc = s.id
      ? await payload.update({ collection: "ideas", id: s.id, data: donnees, depth: 0, overrideAccess: false, user })
      : await payload.create({ collection: "ideas", data: donnees, depth: 0, overrideAccess: false, user });
    rafraichir();
    const detail = await chargerIdee(user, Number(doc.id));
    return detail ? { ok: true, donnees: detail } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function changerStatutIdee(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = z.object({ id: identifiant, statut: z.enum(STATUTS_IDEE) }).safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };

  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "ideas",
      id: lecture.data.id,
      data: { status: lecture.data.statut },
      depth: 0,
      overrideAccess: false,
      user,
    });
    rafraichir();
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/**
 * Le vote, pour ou contre, bascule ; voter d'un cote retire l'autre. Ouvert
 * des la lecture : l'ecriture se fait en systeme, sur une idee que la
 * personne peut lire.
 */
export async function voterIdee(saisie: unknown): Promise<Resultat<{ pour: number; contre: number }>> {
  const { user } = await exigerModule("calendar");
  const lecture = z.object({ id: identifiant, sens: z.enum(["pour", "contre"]) }).safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };

  const existante = await chargerIdee(user, lecture.data.id);
  if (!existante) return { ok: false, erreur: INTROUVABLE };

  const { pour, contre } = appliquerVote(existante.votantsIds, existante.contreIds, Number(user.id), lecture.data.sens);
  const payload = await getPayloadClient();
  try {
    await payload.update({ collection: "ideas", id: lecture.data.id, data: { votes: pour, votes_against: contre }, depth: 0 });
    rafraichir();
    return { ok: true, donnees: { pour: pour.length, contre: contre.length } };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function supprimerIdee(id: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = identifiant.safeParse(id);
  if (!lecture.success) return { ok: false, erreur: "Identifiant invalide." };

  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "ideas", id: lecture.data, depth: 0, overrideAccess: false, user });
    rafraichir();
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function lireIdee(id: unknown): Promise<Resultat<IdeeDetail>> {
  const { user } = await exigerModule("calendar");
  const lecture = identifiant.safeParse(id);
  if (!lecture.success) return { ok: false, erreur: "Identifiant invalide." };
  const detail = await chargerIdee(user, lecture.data);
  return detail ? { ok: true, donnees: detail } : { ok: false, erreur: INTROUVABLE };
}

/**
 * Le post vient d'etre cree depuis « Planifier » : l'idee le retient et
 * passe en Retenue. Le post doit exister pour la personne.
 */
export async function planifierIdee(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = z.object({ ideeId: identifiant, postId: identifiant }).safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const { ideeId, postId } = lecture.data;

  if (!(await chargerIdee(user, ideeId))) return { ok: false, erreur: INTROUVABLE };

  const payload = await getPayloadClient();
  try {
    const post = await payload.find({ collection: "events", where: { id: { equals: postId } }, limit: 1, depth: 0, overrideAccess: false, user });
    if (!post.docs[0]) return { ok: false, erreur: "Le post n'existe pas, ou ne vous est pas ouvert." };
    await payload.update({
      collection: "ideas",
      id: ideeId,
      data: { status: "kept", planned_post: postId },
      depth: 0,
      overrideAccess: false,
      user,
    });
    rafraichir();
    revalidatePath("/hub/calendrier");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}
