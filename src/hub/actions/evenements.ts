"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import { chargerEvenement, type EvenementDetail } from "@/hub/calendrier/donnees";
import { schemaEvenement } from "@/hub/calendrier/schema";
import { depuisChampDateHeure, instant } from "@/hub/dates";
import { estRecurrent } from "@/hub/recurrence";
import { exigerModule } from "@/hub/session";
import { texteVersLexical } from "@/hub/texte";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les actions du calendrier. Chacune verifie le droit cote serveur, puis
 * ecrit avec les droits de la personne : Payload applique en plus ses regles,
 * dont le filtre par flux. Un match LFFS garde ses champs synchronises quoi
 * qu'on envoie, et ne se supprime pas depuis le Hub.
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T } | { ok: false; erreur: string };

const identifiant = z.number().check(z.int(), z.positive());

type Categorie = "post" | "match" | "training" | "other";

const premiereErreur = (erreur: z.core.$ZodError) => erreur.issues[0]?.message ?? "Vérifiez votre saisie.";

async function categorieDuType(typeId: number, user: Parameters<typeof chargerEvenement>[0]): Promise<Categorie | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "event-types",
    where: { id: { equals: typeId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  });
  return (docs[0]?.category as Categorie | undefined) ?? null;
}

function rafraichir() {
  revalidatePath("/hub/calendrier");
  revalidatePath("/hub/calendrier/a-faire");
}

/** Cree ou modifie un evenement. Renvoie le detail a jour. */
export async function enregistrerEvenement(saisie: unknown): Promise<Resultat<EvenementDetail>> {
  const session = await exigerModule("calendar", "edit");
  const { user } = session;

  const lecture = schemaEvenement.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  const debut = depuisChampDateHeure(s.debut);
  const fin = s.fin ? depuisChampDateHeure(s.fin) : null;
  const heureRdv = s.heureRdv ? depuisChampDateHeure(s.heureRdv) : null;
  if (!debut) return { ok: false, erreur: "La date de début est invalide." };
  if (s.fin && !fin) return { ok: false, erreur: "La date de fin est invalide." };
  if (fin && instant(fin) <= instant(debut)) return { ok: false, erreur: "La fin doit être après le début." };
  if (s.recurrence.frequence !== "none" && !s.recurrence.jusquAu) {
    return { ok: false, erreur: "Une récurrence a besoin d'une date de fin." };
  }

  const categorie = await categorieDuType(s.typeId, user);
  if (!categorie) return { ok: false, erreur: "Ce type d'événement n'existe pas." };

  const existant = s.id ? await chargerEvenement(user, s.id) : null;
  if (s.id && !existant) return { ok: false, erreur: "Cet événement n'existe pas, ou ne vous est pas ouvert." };

  const donnees: Record<string, unknown> = {
    title: s.titre,
    type: s.typeId,
    starts_at: debut,
    ends_at: fin,
    all_day: s.journeeEntiere,
    meeting_at: categorie === "match" || categorie === "training" ? heureRdv : null,
    location_name: s.lieuNom || null,
    location_address: s.lieuAdresse || null,
    feeds: s.fluxIds,
    // Le crochet de la collection ramene sur le premier flux si celui-ci n'en fait pas partie.
    primary_feed: s.fluxPrincipalId && s.fluxIds.includes(s.fluxPrincipalId) ? s.fluxPrincipalId : s.fluxIds[0],
    responsibles: s.responsablesIds,
    description: texteVersLexical(s.description),
    internal_notes: texteVersLexical(s.notesInternes),
    cancelled: s.annule,
    no_reminder: s.pasDeRappel,
    recurrence: {
      frequency: s.recurrence.frequence,
      interval: s.recurrence.intervalle,
      weekdays: s.recurrence.frequence === "weekly" ? s.recurrence.jours : [],
      until: s.recurrence.frequence === "none" || !s.recurrence.jusquAu ? null : s.recurrence.jusquAu,
    },
  };

  if (categorie === "post") {
    Object.assign(donnees, {
      status: s.post.statut,
      networks: s.post.reseauxIds,
      format: s.post.formatId,
      caption: s.post.legende || null,
      visuals_link: s.post.lienVisuels || null,
      publication_link: s.post.lienPublication || null,
      views: s.post.vues,
      linked_match: s.post.matchLieId,
    });
    // Un post genere depuis un match ne suit plus ce match des qu'on y touche a la main.
    if (existant?.post.modeleId) {
      if (existant.debut !== debut) donnees.date_edited_manually = true;
      if (existant.post.legende !== s.post.legende) donnees.caption_edited_manually = true;
    }
  }

  if (categorie === "match") {
    if (existant?.verrouille) {
      // Les champs synchronises restent ceux de la LFFS, quoi que le formulaire envoie.
      for (const champ of ["title", "starts_at", "ends_at", "location_name", "location_address"]) delete donnees[champ];
    } else {
      Object.assign(donnees, {
        source: existant?.match.source ?? "manual",
        opponent: s.match.adversaire || null,
        home: s.match.domicile,
        competition: s.match.competition || null,
      });
    }
  }

  const payload = await getPayloadClient();
  try {
    const doc = s.id
      ? await payload.update({ collection: "events", id: s.id, data: donnees, depth: 0, overrideAccess: false, user })
      : await payload.create({ collection: "events", data: donnees, depth: 0, overrideAccess: false, user });
    rafraichir();
    const detail = await chargerEvenement(user, Number(doc.id));
    return detail ? { ok: true, donnees: detail } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/** Deplace ou redimensionne un evenement, apres un glisser dans le calendrier. */
export async function deplacerEvenement(saisie: unknown): Promise<Resultat<{ debut: string; fin: string | null }>> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = z
    .object({ id: identifiant, debut: z.iso.datetime({ offset: true }), fin: z.nullable(z.iso.datetime({ offset: true })) })
    .safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const { id, debut, fin } = lecture.data;

  const existant = await chargerEvenement(user, id);
  if (!existant) return { ok: false, erreur: "Cet événement n'existe pas, ou ne vous est pas ouvert." };
  if (existant.verrouille) return { ok: false, erreur: "Un match LFFS ne se déplace pas depuis le Hub." };
  if (estRecurrent({ frequency: existant.recurrence.frequence })) {
    return { ok: false, erreur: "Un événement récurrent se modifie depuis son formulaire." };
  }
  if (fin && instant(fin) <= instant(debut)) return { ok: false, erreur: "La fin doit être après le début." };

  const donnees: Record<string, unknown> = {
    starts_at: new Date(debut).toISOString(),
    ends_at: fin ? new Date(fin).toISOString() : null,
  };
  if (existant.post.modeleId && existant.debut !== donnees.starts_at) donnees.date_edited_manually = true;

  const payload = await getPayloadClient();
  try {
    await payload.update({ collection: "events", id, data: donnees, depth: 0, overrideAccess: false, user });
    rafraichir();
    return { ok: true, donnees: { debut: existant.debut, fin: existant.fin } };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function supprimerEvenement(id: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = identifiant.safeParse(id);
  if (!lecture.success) return { ok: false, erreur: "Identifiant invalide." };

  const existant = await chargerEvenement(user, lecture.data);
  if (!existant) return { ok: false, erreur: "Cet événement n'existe pas, ou ne vous est pas ouvert." };
  if (existant.verrouille) return { ok: false, erreur: "Un match LFFS ne se supprime pas depuis le Hub." };

  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "events", id: lecture.data, depth: 0, overrideAccess: false, user });
    rafraichir();
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function changerStatut(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar", "edit");
  const lecture = z
    .object({ id: identifiant, statut: z.enum(["to_create", "ready", "published", "cancelled"]) })
    .safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };

  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "events",
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

/** Le detail d'un evenement, pour le panneau. Lecture suffit. */
export async function lireEvenement(id: unknown): Promise<Resultat<EvenementDetail>> {
  const { user } = await exigerModule("calendar");
  const lecture = identifiant.safeParse(id);
  if (!lecture.success) return { ok: false, erreur: "Identifiant invalide." };
  const detail = await chargerEvenement(user, lecture.data);
  return detail ? { ok: true, donnees: detail } : { ok: false, erreur: "Cet événement n'existe pas, ou ne vous est pas ouvert." };
}

/** Commenter est ouvert des la lecture. */
export async function ajouterCommentaire(saisie: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar");
  const lecture = z
    .object({
      relationTo: z.enum(["events", "ideas"]),
      id: identifiant,
      contenu: z.string().check(z.trim(), z.minLength(1, "Le commentaire est vide."), z.maxLength(2000)),
    })
    .safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const { relationTo, id, contenu } = lecture.data;

  const payload = await getPayloadClient();
  try {
    // La cible doit exister pour cette personne : sinon Payload refuse la lecture.
    const cible = await payload.find({ collection: relationTo, where: { id: { equals: id } }, limit: 1, depth: 0, overrideAccess: false, user });
    if (!cible.docs[0]) return { ok: false, erreur: "La cible n'existe pas, ou ne vous est pas ouverte." };
    await payload.create({
      collection: "comments",
      data: { target: { relationTo, value: id }, content: contenu },
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

export async function supprimerCommentaire(id: unknown): Promise<Resultat> {
  const { user } = await exigerModule("calendar");
  const lecture = identifiant.safeParse(id);
  if (!lecture.success) return { ok: false, erreur: "Identifiant invalide." };

  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "comments", id: lecture.data, depth: 0, overrideAccess: false, user });
    rafraichir();
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

function messageDe(erreur: unknown): string {
  if (erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string") {
    return erreur.message;
  }
  return "L'enregistrement a échoué.";
}
