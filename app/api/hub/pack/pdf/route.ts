import { NextResponse, type NextRequest } from "next/server";

import { versChampDate } from "@/hub/dates";
import { peutEditer } from "@/hub/droits";
import { recapPourJoma } from "@/hub/pack/calculs";
import { chargerCommandeJoma, chargerCommandes, listerArticles } from "@/hub/pack/donnees";
import { pdfCommandeJoma } from "@/hub/pack/pdf";
import { lireSession } from "@/hub/session";

export const dynamic = "force-dynamic";

const pdf = (octets: Uint8Array, nom: string) =>
  new NextResponse(new Uint8Array(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "private, no-store",
    },
  });

/**
 * Le PDF de la commande Joma pour les commandes cochees dans le Hub, les
 * recues seulement, sans les articles ecartes. Avec `copieDe`, la copie
 * d'une commande deja passee chez Joma, refaite depuis ce qui a ete garde a
 * « Marquer commandees » : identique, quoi qu'il soit arrive depuis au
 * catalogue ou aux commandes. Reserve a qui peut editer le Pack : c'est le
 * document qui part chez le fournisseur.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session || !peutEditer(session.user, "pack")) {
    return NextResponse.json({ erreur: "Réservé à qui peut éditer le pack." }, { status: 403 });
  }

  let corps: { ids?: unknown; ecartes?: unknown; copieDe?: unknown };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const maintenant = new Date();

  if (corps.copieDe !== undefined) {
    const id = corps.copieDe;
    const gardee = typeof id === "number" && Number.isInteger(id) && id > 0 ? await chargerCommandeJoma(id) : null;
    if (!gardee || gardee.recap.pieces === 0) return NextResponse.json({ erreur: "Cette commande Joma n'existe plus." }, { status: 404 });
    const octets = await pdfCommandeJoma(gardee.recap, maintenant, { copie: true, passeeLe: gardee.passeeLe || null });
    return pdf(octets, `commande-joma-${gardee.passeeLe || versChampDate(maintenant)}-copie.pdf`);
  }

  const ids = Array.isArray(corps.ids) ? corps.ids.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, 500) : [];
  const ecartes = Array.isArray(corps.ecartes) ? corps.ecartes.filter((e): e is string => typeof e === "string") : [];
  if (ids.length === 0) return NextResponse.json({ erreur: "Aucune commande cochée." }, { status: 400 });

  const [commandes, catalogue] = await Promise.all([chargerCommandes(ids), listerArticles({ actifsSeulement: false })]);
  // Les recues seulement, chaque article sous son nom Joma : comme la copie gardee a « Marquer commandees ».
  const recap = recapPourJoma(commandes, catalogue, new Set(ecartes));
  if (recap.pieces === 0) return NextResponse.json({ erreur: "Rien à commander dans cette sélection." }, { status: 400 });

  return pdf(await pdfCommandeJoma(recap, maintenant), `commande-joma-${versChampDate(maintenant)}.pdf`);
}
