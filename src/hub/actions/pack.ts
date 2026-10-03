"use server";

import { revalidatePath } from "next/cache";

import type { Resultat } from "@/hub/actions/evenements";
import { versChampDate } from "@/hub/dates";
import { construireLignes } from "@/hub/pack/calculs";
import { versLignesCollection } from "@/hub/pack/conversions";
import { chargerArticle, chargerCommande, chargerReglagesPack, listerArticles } from "@/hub/pack/donnees";
import {
  premiereErreur,
  schemaArticle,
  schemaCommandeHub,
  schemaReglagesPack,
  type Article,
  type Commande,
  type ReglagesPack,
} from "@/hub/pack/schema";
import { exigerModule } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";
import { genererJeton } from "@/payload/collections/hub/Feeds";

/**
 * Les actions du Pack cote Hub : le catalogue, les reglages de la page des
 * joueurs et la correction d'une commande. Toutes demandent l'edition sur le
 * module ; l'ecriture se fait ensuite en systeme, limitee a ce que la saisie
 * verifiee contient.
 */

function messageDe(erreur: unknown): string {
  if (erreur && typeof erreur === "object" && "message" in erreur && typeof erreur.message === "string") {
    return erreur.message;
  }
  return "L'enregistrement a échoué.";
}

/** Un jour « 2026-10-31 » range a midi, pour qu'il reste le meme jour dans tous les fuseaux. */
const jourEnDate = (jour: string) => new Date(`${jour}T12:00:00Z`).toISOString();

export async function enregistrerArticle(saisie: unknown): Promise<Resultat<Article>> {
  await exigerModule("pack", "edit");
  const lecture = schemaArticle.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  const data = {
    name: s.nom,
    description: s.description,
    price: s.prix,
    sizes: s.tailles,
    flockable: s.floquable,
    active: s.actif,
    variants: s.variantes.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      color: v.couleur,
      reference: v.reference,
      photo: v.photoId,
    })),
  };

  const payload = await getPayloadClient();
  try {
    let id = s.id;
    if (id) {
      await payload.update({ collection: "pack-articles", id, data, depth: 0 });
    } else {
      // Un nouvel article se range apres les autres.
      const { docs } = await payload.find({ collection: "pack-articles", sort: "-sort_order", limit: 1, depth: 0 });
      const dernier = Number(docs[0]?.sort_order ?? 0);
      const doc = await payload.create({ collection: "pack-articles", data: { ...data, sort_order: dernier + 1 }, depth: 0 });
      id = Number(doc.id);
    }
    revalidatePath("/hub/pack", "layout");
    const relu = await chargerArticle(id, payload);
    return relu ? { ok: true, donnees: relu } : { ok: false, erreur: "Enregistré, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

export async function enregistrerReglagesPack(saisie: unknown): Promise<Resultat<ReglagesPack>> {
  await exigerModule("pack", "edit");
  const lecture = schemaReglagesPack.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  const payload = await getPayloadClient();
  try {
    await payload.updateGlobal({
      slug: "pack-settings",
      data: {
        open: s.ouvert,
        deadline: s.dateLimite ? jourEnDate(s.dateLimite) : null,
        password: s.motDePasse,
        flock_number_price: s.prixNumero,
        flock_name_price: s.prixNom,
      },
      depth: 0,
    });
    revalidatePath("/hub/pack", "layout");
    return { ok: true, donnees: await chargerReglagesPack(payload) };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/** Un nouveau lien : l'ancien cesse aussitot de fonctionner. */
export async function regenererLienPack(): Promise<Resultat<ReglagesPack>> {
  await exigerModule("pack", "edit");
  const payload = await getPayloadClient();
  try {
    await payload.updateGlobal({ slug: "pack-settings", data: { token: genererJeton() }, depth: 0 });
    revalidatePath("/hub/pack", "layout");
    return { ok: true, donnees: await chargerReglagesPack(payload) };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/**
 * Les commandes cochees, passees chez Joma d'un coup : statut « commandee »
 * et date du jour, sauf pour celles qui l'avaient deja.
 */
export async function passerCommandeesChezJoma(ids: unknown): Promise<Resultat> {
  await exigerModule("pack", "edit");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    return { ok: false, erreur: "Aucune commande valable n'est cochée." };
  }
  const payload = await getPayloadClient();
  const aujourdHui = jourEnDate(versChampDate(new Date()));
  try {
    const { docs } = await payload.find({
      collection: "pack-orders",
      where: { id: { in: ids as number[] } },
      limit: ids.length,
      depth: 0,
    });
    for (const doc of docs) {
      await payload.update({
        collection: "pack-orders",
        id: doc.id,
        data: { status: "ordered", ...(doc.ordered_at ? {} : { ordered_at: aujourdHui }) },
        depth: 0,
      });
    }
    revalidatePath("/hub/pack", "layout");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/**
 * Une commande corrigee par le club : lignes, coordonnees, statut. Les
 * lignes repassent par le catalogue, articles retires compris ; celles qui
 * n'ont pas change de nature gardent leur prix d'origine.
 */
export async function enregistrerCommande(saisie: unknown): Promise<Resultat<Commande>> {
  await exigerModule("pack", "edit");
  const lecture = schemaCommandeHub.safeParse(saisie);
  if (!lecture.success) return { ok: false, erreur: premiereErreur(lecture.error) };
  const s = lecture.data;

  const payload = await getPayloadClient();
  const existante = await chargerCommande(s.id, payload);
  if (!existante) return { ok: false, erreur: "Cette commande n'existe plus." };

  const [catalogue, reglages] = await Promise.all([listerArticles({ actifsSeulement: false }, payload), chargerReglagesPack(payload)]);
  const construction = construireLignes(s.lignes, catalogue, reglages.flocage, {
    inactifsAdmis: true,
    anciennes: existante.lignes,
  });
  if (!construction.ok) return { ok: false, erreur: construction.erreur };

  // La date de commande chez Joma se pose au passage en « commandee », une fois.
  const commandeeLe =
    s.statut === "ordered" && !existante.commandeeLe ? jourEnDate(versChampDate(new Date())) : undefined;

  try {
    await payload.update({
      collection: "pack-orders",
      id: s.id,
      data: {
        phone: s.telephone,
        email: s.email,
        note: s.remarque,
        status: s.statut,
        lines: versLignesCollection(construction.lignes),
        total: construction.total,
        ...(commandeeLe ? { ordered_at: commandeeLe } : {}),
      },
      depth: 0,
    });
    revalidatePath("/hub/pack", "layout");
    const relue = await chargerCommande(s.id, payload);
    return relue ? { ok: true, donnees: relue } : { ok: false, erreur: "Enregistrée, mais impossible à relire." };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}
