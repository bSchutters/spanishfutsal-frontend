"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { idsFluxAutorises } from "@/hub/droits";
import { clePubliqueVapid, envoyerAPersonne } from "@/hub/rappels/envoi";
import { exigerAccesHub } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les actions des notifications, depuis le profil : enregistrer ou retirer
 * l'appareil, regler les flux notifies, envoyer un essai. Tout est propre a
 * la personne connectee.
 */

const schemaAbonnement = z.object({
  endpoint: z.string().check(z.minLength(1), z.maxLength(2000)),
  keys: z.object({ p256dh: z.string().check(z.minLength(1)), auth: z.string().check(z.minLength(1)) }),
  userAgent: z.optional(z.string().check(z.maxLength(500))),
});

function messageDe(erreur: unknown): string {
  return erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string"
    ? erreur.message
    : "L'opération a échoué.";
}

/** La cle publique que le navigateur donne au service push pour s'abonner. */
export async function lireClePublique(): Promise<Resultat<{ cle: string }>> {
  await exigerAccesHub();
  const cle = clePubliqueVapid();
  return cle ? { ok: true, donnees: { cle } } : { ok: false, erreur: "Les notifications ne sont pas configurées sur le serveur." };
}

/** Enregistre cet appareil, ou le met a jour s'il est deja connu, et active le push pour la personne. */
export async function enregistrerAbonnement(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerAccesHub();
  const lecture = schemaAbonnement.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: "Abonnement illisible." };
  const { endpoint, keys, userAgent } = lecture.data;

  const payload = await getPayloadClient();
  try {
    const existant = await payload.find({ collection: "push-subscriptions", where: { endpoint: { equals: endpoint } }, limit: 1, depth: 0 });
    const data = { user: Number(user.id), endpoint, keys, user_agent: userAgent ?? null };
    if (existant.docs[0]) {
      await payload.update({ collection: "push-subscriptions", id: existant.docs[0].id, data, depth: 0 });
    } else {
      await payload.create({ collection: "push-subscriptions", data, depth: 0 });
    }
    await payload.update({ collection: "users", id: user.id, data: { hub: { push_enabled: true } }, depth: 0, overrideAccess: false, user });
    revalidatePath("/hub/profil");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/** Retire cet appareil. Sans plus aucun appareil, le push de la personne s'eteint. */
export async function retirerAbonnement(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerAccesHub();
  const lecture = z.object({ endpoint: z.string().check(z.minLength(1)) }).safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: "Abonnement illisible." };

  const payload = await getPayloadClient();
  try {
    await payload.delete({
      collection: "push-subscriptions",
      where: { and: [{ endpoint: { equals: lecture.data.endpoint } }, { user: { equals: user.id } }] },
      depth: 0,
    });
    const restants = await payload.count({ collection: "push-subscriptions", where: { user: { equals: user.id } } });
    if (restants.totalDocs === 0) {
      await payload.update({ collection: "users", id: user.id, data: { hub: { push_enabled: false } }, depth: 0, overrideAccess: false, user });
    }
    revalidatePath("/hub/profil");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/** Les flux dont la personne veut les rappels, parmi ceux qui lui sont ouverts. */
export async function reglerFluxNotifies(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerAccesHub();
  const lecture = z.object({ fluxIds: z.array(z.number().check(z.int(), z.positive())) }).safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: "Sélection illisible." };

  const autorises = idsFluxAutorises(user);
  const retenus = autorises === null ? lecture.data.fluxIds : lecture.data.fluxIds.filter((id) => autorises.map(Number).includes(id));

  const payload = await getPayloadClient();
  try {
    await payload.update({ collection: "users", id: user.id, data: { hub: { notified_feeds: retenus } }, depth: 0, overrideAccess: false, user });
    revalidatePath("/hub/profil");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/** Une notification d'essai sur tous les appareils de la personne. */
export async function envoyerNotificationDeTest(): Promise<Resultat<{ envoyes: number }>> {
  const { user } = await exigerAccesHub();
  const payload = await getPayloadClient();
  const r = await envoyerAPersonne(payload, Number(user.id), {
    title: "Hub UDA",
    body: "Les notifications fonctionnent sur cet appareil.",
    url: "/hub/profil",
    tag: "essai",
  });
  if (r.envoyes === 0) {
    return { ok: false, erreur: r.echecs[0] ? `Envoi refusé : ${r.echecs[0]}` : "Aucun appareil abonné." };
  }
  return { ok: true, donnees: { envoyes: r.envoyes } };
}
