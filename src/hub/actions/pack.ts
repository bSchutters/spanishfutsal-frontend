"use server";

import { revalidatePath } from "next/cache";
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from "payload";

import type { Resultat } from "@/hub/actions/evenements";
import { versChampDate } from "@/hub/dates";
import { commandesPourJoma, construireLignes, montantPourJoma, recapPourJoma } from "@/hub/pack/calculs";
import { dispositionDe, tagsDe, versLignesCollection } from "@/hub/pack/conversions";
import { chargerArticle, chargerCommande, chargerCommandes, chargerReglagesPack, listerArticles } from "@/hub/pack/donnees";
import {
  lireOrdre,
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

/**
 * Plusieurs ecritures d'un seul tenant : toutes passent, ou aucune. Les
 * operations recoivent `req`, qui porte la transaction.
 */
async function enTransaction<T>(payload: Payload, ecrire: (req: PayloadRequest) => Promise<T>): Promise<T> {
  const req = await createLocalReq({}, payload);
  const ouverte = await initTransaction(req);
  try {
    const resultat = await ecrire(req);
    if (ouverte) await commitTransaction(req);
    return resultat;
  } catch (erreur) {
    await killTransaction(req);
    throw erreur;
  }
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
    joma_name: s.nomJoma ?? "",
    reference: s.reference,
    description: s.description,
    price: s.prixCatalogue,
    discount_mode: s.modeRemise,
    custom_discount: s.modeRemise === "custom" ? s.remiseParticuliere : null,
    sizes: s.tailles,
    tags: tagsDe(s.tags ?? []),
    flockable: s.floquable,
    flock_layout: dispositionDe(s.dispositionFlocage),
    active: s.actif,
    variants: s.variantes.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      color: v.couleur,
      reference: v.codeCouleur,
      photo: v.photoIds[0] ?? null,
      photos: v.photoIds.slice(1),
      // Une photo de dos qui n'est plus parmi les photos de la couleur ne compte plus.
      back_photo_id: v.photoDosId !== null && v.photoIds.includes(v.photoDosId) ? v.photoDosId : null,
      flock_fill: v.couleursFlocage.remplissage,
      flock_outline: v.couleursFlocage.contour,
      flock_outer: v.couleursFlocage.exterieur,
      flock_logo: v.logo ?? "club",
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

/**
 * Un article supprime du catalogue. Les commandes qui le contiennent gardent
 * leurs lignes, qui portent leur propre copie de l'article. Ses photos restent
 * dans les Medias du site.
 */
export async function supprimerArticle(id: unknown): Promise<Resultat> {
  await exigerModule("pack", "edit");
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return { ok: false, erreur: "Article inconnu." };
  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "pack-articles", id });
    revalidatePath("/hub/pack", "layout");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/**
 * Supprimer une commande, pour de bon. Pour la garder dans la liste, hors des
 * totaux, l'annuler plutot (statut « annulee »).
 */
export async function supprimerCommande(id: unknown): Promise<Resultat> {
  await exigerModule("pack", "edit");
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return { ok: false, erreur: "Commande inconnue." };
  const payload = await getPayloadClient();
  try {
    await payload.delete({ collection: "pack-orders", id });
    revalidatePath("/hub/pack", "layout");
    return { ok: true };
  } catch (erreur) {
    return { ok: false, erreur: messageDe(erreur) };
  }
}

/**
 * L'ordre du catalogue, glisse dans le Hub : chaque article prend son rang
 * dans la liste recue, et la page des joueurs suit cet ordre. La liste doit
 * couvrir tout le catalogue ; seuls les articles qui changent de rang
 * s'ecrivent, d'un seul tenant.
 */
export async function reordonnerArticles(ids: unknown): Promise<Resultat> {
  await exigerModule("pack", "edit");
  const liste = lireOrdre(ids);
  if (!liste) return { ok: false, erreur: "Cet ordre n'est pas valable." };
  const payload = await getPayloadClient();
  try {
    const { docs } = await payload.find({
      collection: "pack-articles",
      where: { id: { in: liste } },
      limit: liste.length,
      depth: 0,
    });
    const { totalDocs } = await payload.count({ collection: "pack-articles" });
    if (docs.length !== liste.length || totalDocs !== liste.length) {
      return { ok: false, erreur: "Le catalogue a changé entre-temps : rechargez la page." };
    }
    const rangs = new Map(docs.map((doc) => [Number(doc.id), doc.sort_order]));
    await enTransaction(payload, async (req) => {
      for (const [rang, id] of liste.entries()) {
        if (rangs.get(id) === rang) continue;
        await payload.update({ collection: "pack-articles", id, data: { sort_order: rang }, depth: 0, req });
      }
    });
    revalidatePath("/hub/pack", "layout");
    return { ok: true };
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
        discount: s.remise,
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
 * Les commandes cochees, passees chez Joma d'un coup. Ce qui part est garde
 * tel quel (collection pack-joma-orders) : le recapitulatif du PDF, avec les
 * memes articles ecartes, pour en retelecharger une vraie copie plus tard.
 * Chaque ligne qui part retient cette commande Joma ; une commande passe en
 * « commandee », date du jour, quand plus aucune de ses lignes ne reste a
 * commander, et reste recue sinon (Bryan, 07/10/2026). Le tout d'un seul
 * tenant. Rend les commandes touchees, relues.
 */
export async function passerCommandeesChezJoma(ids: unknown, ecartes: unknown = []): Promise<Resultat<Commande[]>> {
  await exigerModule("pack", "edit");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    return { ok: false, erreur: "Aucune commande valable n'est cochée." };
  }
  const articlesEcartes = new Set(Array.isArray(ecartes) ? ecartes.filter((e): e is string => typeof e === "string").slice(0, 300) : []);
  const payload = await getPayloadClient();
  const aujourdHui = jourEnDate(versChampDate(new Date()));
  try {
    const [commandes, catalogue] = await Promise.all([chargerCommandes(ids as number[], payload), listerArticles({ actifsSeulement: false }, payload)]);
    // Chaque commande reduite a ses lignes qui partent maintenant.
    const parties = commandesPourJoma(commandes, articlesEcartes);
    if (parties.length === 0) return { ok: false, erreur: "Rien à commander dans cette sélection. Rechargez la page." };

    await enTransaction(payload, async (req) => {
      const gardee = await payload.create({
        collection: "pack-joma-orders",
        data: {
          ordered_at: aujourdHui,
          amount: montantPourJoma(parties, articlesEcartes),
          recap: recapPourJoma(parties, catalogue, articlesEcartes),
          order_ids: parties.map((p) => p.id),
          excluded: [...articlesEcartes],
        },
        depth: 0,
        req,
      });
      for (const partie of parties) {
        const commande = commandes.find((x) => x.id === partie.id);
        if (!commande) continue;
        const quiPartent = new Set(partie.lignes.map((l) => l.id));
        const lignes = commande.lignes.map((l) => (quiPartent.has(l.id) ? { ...l, commandeJoma: Number(gardee.id) } : l));
        const complete = lignes.every((l) => l.commandeJoma !== null);
        await payload.update({
          collection: "pack-orders",
          id: commande.id,
          data: {
            lines: versLignesCollection(lignes),
            ...(complete ? { status: "ordered", ...(commande.commandeeLe ? {} : { ordered_at: aujourdHui }) } : {}),
          },
          depth: 0,
          req,
        });
      }
    });
    revalidatePath("/hub/pack", "layout");
    return { ok: true, donnees: await chargerCommandes(parties.map((p) => p.id), payload) };
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
