"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import * as z from "zod/mini";

import type { Resultat } from "@/hub/actions/evenements";
import { chargerMembre, type Membre } from "@/hub/membres/donnees";
import { nettoyerSelonAcces, schemaDroitsMembre, schemaNouveauMembre, versLignesModules } from "@/hub/membres/schema";
import { estSuperAdmin } from "@/hub/droits";
import { exigerAdmin } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

z.config({ jitless: true });

/**
 * Les droits d'un compte sur le Hub, regles depuis le Hub lui-meme. Reserve
 * aux administrateurs, ici comme dans la collection : l'ecriture se fait avec
 * leurs droits, `overrideAccess: false`, donc les regles de Users et de ses
 * champs s'appliquent une seconde fois. Seuls l'acces, les modules et les
 * flux autorises sont touches ; le role et les rappels que la personne a
 * choisis restent hors de portee. Le mot de passe ne se choisit pas ici : un
 * nouveau, tire au hasard, remplace l'actuel en cas d'oubli.
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

/**
 * Un mot de passe tire au hasard, assez long pour tenir, assez court pour se
 * recopier. Des caracteres sans ambiguite a l'oeil ni a la dictee.
 */
function motDePasseAuHasard(longueur = 14): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const octets = randomBytes(longueur);
  return Array.from(octets, (octet) => alphabet[octet % alphabet.length]).join("");
}

/**
 * Un nouveau mot de passe pour un membre qui a oublie le sien (demande de
 * Bryan, 07/10/2026) : tire au hasard, il remplace l'actuel et revient une
 * seule fois, a transmettre ; la personne le change ensuite dans son profil.
 * Reserve au super administrateur, pas a tout administrateur. Pas pour un
 * administrateur : son compte se gere par lui-meme depuis son profil.
 */
export async function nouveauMotDePasseMembre(id: unknown): Promise<Resultat<{ membre: Membre; motDePasse: string }>> {
  const { user } = await exigerAdmin();
  if (!estSuperAdmin(user, process.env.HUB_SUPER_ADMINS)) return { ok: false, erreur: "Réservé au super administrateur." };
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return { ok: false, erreur: "Ce compte n'existe pas." };
  const existant = await chargerMembre(user, id);
  if (!existant) return { ok: false, erreur: "Ce compte n'existe pas." };
  if (existant.administrateur) {
    return { ok: false, erreur: "Le mot de passe d'un administrateur se change dans son profil, ou dans l'administration Payload." };
  }

  const motDePasse = motDePasseAuHasard();
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "users",
      id,
      data: { password: motDePasse },
      depth: 0,
      overrideAccess: false,
      user,
    });
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
  return { ok: true, donnees: { membre: existant, motDePasse } };
}

/**
 * Un compte de plus, cree depuis le Hub. Toujours un membre, jamais un
 * administrateur : ce role se donne dans l'administration Payload, ou les
 * verrous contre l'enfermement dehors vivent. Le mot de passe est tire au
 * hasard et renvoye une seule fois, a transmettre a la personne, qui pourra
 * le changer.
 */
export async function creerMembre(saisie: unknown): Promise<Resultat<{ membre: Membre; motDePasse: string }>> {
  const { user } = await exigerAdmin();
  const lecture = schemaNouveauMembre.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;
  const droits = nettoyerSelonAcces({ id: 1, acces: s.acces, niveaux: s.niveaux, fluxIds: s.fluxIds });

  const payload = await getPayloadClient();
  const email = s.email.toLowerCase();
  const { totalDocs } = await payload.count({ collection: "users", where: { email: { equals: email } } });
  if (totalDocs > 0) return { ok: false, erreur: "Un compte porte déjà cette adresse." };

  const motDePasse = motDePasseAuHasard();
  try {
    const doc = await payload.create({
      collection: "users",
      data: {
        email,
        password: motDePasse,
        first_name: s.prenom,
        last_name: s.nom,
        role: "manager",
        hub: { access: droits.acces, modules: versLignesModules(droits.niveaux), feeds: droits.fluxIds },
      },
      depth: 0,
      overrideAccess: false,
      user,
    });
    revalidatePath("/hub/membres");
    const relu = await chargerMembre(user, Number(doc.id));
    return relu ? { ok: true, donnees: { membre: relu, motDePasse } } : { ok: false, erreur: "Créé, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}
