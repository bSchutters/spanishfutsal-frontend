"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Resultat } from "@/hub/actions/evenements";
import { versChampDate } from "@/hub/dates";
import { adresseIp, limiteAtteinte, verifierLimite, type Limite } from "@/hub/limiteur";
import { accesValide, COOKIE_ACCES_PACK, DUREE_ACCES_PACK_SECONDES, motDePasseCorrect, signatureAcces } from "@/hub/pack/acces";
import { construireLignes, dateLimitePassee } from "@/hub/pack/calculs";
import { versLignesCollection } from "@/hub/pack/conversions";
import { chargerReglagesPack, listerArticles, listerEffectifActif } from "@/hub/pack/donnees";
import { premiereErreur, schemaCommandeJoueur, type LigneCommande } from "@/hub/pack/schema";
import { getPayloadClient } from "@/lib/payload";

/**
 * Les actions de la page des joueurs, sans compte : elles verifient elles-
 * memes le lien, puis le cookie pose par le mot de passe. Rien de ce que le
 * navigateur envoie ne fixe un prix ni un nom d'article : tout est relu
 * dans le catalogue.
 */

// Toute une equipe peut passer par la meme box, au club ou a la maison : les
// limites sont larges et ne comptent que les mauvais mots de passe et les
// commandes vraiment enregistrees.
const LIMITE_MOT_DE_PASSE: Limite = { max: 20, fenetreMs: 15 * 60 * 1000 };
const LIMITE_COMMANDES: Limite = { max: 60, fenetreMs: 60 * 60 * 1000 };

function secret(): string {
  const valeur = process.env.PAYLOAD_SECRET;
  if (!valeur) throw new Error("PAYLOAD_SECRET manquant");
  return valeur;
}

const cookieSecurise = () => process.env.NODE_ENV === "production" && process.env.ESSAI_HTTP_RESEAU_LOCAL !== "1";

export type EtatMotDePassePack = { erreur?: string };

/** Le mot de passe de la page : bon, il ouvre la page pour trente jours sur ce navigateur. */
export async function entrerPack(jeton: string, _etat: EtatMotDePassePack, formData: FormData): Promise<EtatMotDePassePack> {
  const payload = await getPayloadClient();
  const reglages = await chargerReglagesPack(payload);
  if (reglages.jeton !== jeton) return { erreur: "Ce lien n'est plus valable. Demandez le nouveau au club." };

  const cle = `pack:mot-de-passe:${await adresseIp()}`;
  if (await limiteAtteinte(payload, cle, LIMITE_MOT_DE_PASSE)) return { erreur: "Trop de tentatives. Réessayez dans un quart d'heure." };

  if (!motDePasseCorrect(String(formData.get("motDePasse") ?? ""), reglages.motDePasse)) {
    await verifierLimite(payload, cle, LIMITE_MOT_DE_PASSE);
    return { erreur: "Mot de passe incorrect." };
  }

  (await cookies()).set({
    name: COOKIE_ACCES_PACK,
    value: signatureAcces(secret(), reglages.jeton, reglages.motDePasse),
    httpOnly: true,
    secure: cookieSecurise(),
    sameSite: "lax",
    path: "/pack",
    maxAge: DUREE_ACCES_PACK_SECONDES,
  });
  redirect(`/pack/${jeton}`);
}

export type CommandeEnvoyee = { numero: number; personne: string; lignes: LigneCommande[]; total: number };

export async function envoyerCommande(jeton: string, saisie: unknown): Promise<Resultat<CommandeEnvoyee>> {
  const payload = await getPayloadClient();
  const reglages = await chargerReglagesPack(payload);
  const cookie = (await cookies()).get(COOKIE_ACCES_PACK)?.value;
  if (reglages.jeton !== jeton || !accesValide(cookie, secret(), reglages.jeton, reglages.motDePasse)) {
    return { ok: false, erreur: "L'accès a changé. Rechargez la page et entrez le mot de passe." };
  }
  if (!reglages.ouvert || dateLimitePassee(reglages.dateLimite, versChampDate(new Date()))) {
    return { ok: false, erreur: "Les commandes sont fermées." };
  }

  const lecture = schemaCommandeJoueur.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  const [catalogue, effectif] = await Promise.all([listerArticles({ actifsSeulement: true }, payload), listerEffectifActif(payload)]);
  const personne = s.joueurId !== null ? effectif.find((p) => p.id === s.joueurId) : null;
  if (s.joueurId !== null && !personne) return { ok: false, erreur: "Ce nom n'est plus dans la liste. Rechargez la page." };

  const construction = construireLignes(
    s.lignes.map((l) => ({ ...l, id: null })),
    catalogue,
    reglages.flocage,
    { inactifsAdmis: false },
  );
  if (!construction.ok) return { ok: false, erreur: construction.erreur };

  // Comptee une fois lue et valable : une saisie refusee ne pese pas sur la limite.
  const limite = await verifierLimite(payload, `pack:commande:${await adresseIp()}`, LIMITE_COMMANDES);
  if (!limite.ok) return { ok: false, erreur: "Trop de commandes envoyées d'ici. Réessayez dans une heure." };

  try {
    const doc = await payload.create({
      collection: "pack-orders",
      data: {
        player: s.joueurId,
        other_name: s.joueurId === null ? s.autreNom : "",
        phone: s.telephone,
        email: s.email,
        note: s.remarque,
        lines: versLignesCollection(construction.lignes),
        total: construction.total,
        status: "received",
      },
      depth: 0,
    });
    return {
      ok: true,
      donnees: {
        numero: Number(doc.id),
        personne: personne ? personne.nom : s.autreNom,
        lignes: construction.lignes,
        total: construction.total,
      },
    };
  } catch (erreur) {
    console.error("Pack : enregistrement de la commande echoue", erreur);
    return { ok: false, erreur: "La commande n'est pas partie. Réessayez dans un instant." };
  }
}
