import { NextResponse, type NextRequest } from "next/server";

import { versChampDate } from "@/hub/dates";
import { peutEditer } from "@/hub/droits";
import { aCommanderChezJoma, enNomsJoma, passeesChezJoma, recapJoma, taillesSelonNomJoma } from "@/hub/pack/calculs";
import { chargerCommandes, listerArticles } from "@/hub/pack/donnees";
import { pdfCommandeJoma } from "@/hub/pack/pdf";
import { lireSession } from "@/hub/session";

export const dynamic = "force-dynamic";

/**
 * Le PDF de la commande Joma pour les commandes cochees dans le Hub, les
 * recues seulement, sans les articles ecartes. En copie, le PDF d'une
 * commande deja passee chez Joma, sans rien changer aux commandes. Reserve
 * a qui peut editer le Pack : c'est le document qui part chez le fournisseur.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session || !peutEditer(session.user, "pack")) {
    return NextResponse.json({ erreur: "Réservé à qui peut éditer le pack." }, { status: 403 });
  }

  let corps: { ids?: unknown; ecartes?: unknown; copie?: unknown };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const ids = Array.isArray(corps.ids) ? corps.ids.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, 500) : [];
  const ecartes = Array.isArray(corps.ecartes) ? corps.ecartes.filter((e): e is string => typeof e === "string") : [];
  if (ids.length === 0) return NextResponse.json({ erreur: "Aucune commande cochée." }, { status: 400 });

  const copie = corps.copie === true;
  const [chargees, catalogue] = await Promise.all([chargerCommandes(ids), listerArticles({ actifsSeulement: false })]);
  // Les commandes recues seulement : une commande deja passee chez Joma n'y repart pas. En copie, a l'inverse.
  const commandes = copie ? passeesChezJoma(chargees) : aCommanderChezJoma(chargees);
  // La date de la commande copiee, quand toutes ont ete passees le meme jour.
  const dates = new Set(commandes.map((c) => c.commandeeLe));
  const passeeLe = copie && dates.size === 1 ? [...dates][0] : null;
  // Le PDF parle a Joma : chaque article sous son nom Joma.
  const recap = recapJoma(enNomsJoma(commandes, catalogue, new Set(ecartes)), new Set(), taillesSelonNomJoma(catalogue));
  if (recap.pieces === 0) return NextResponse.json({ erreur: "Rien à commander dans cette sélection." }, { status: 400 });

  const maintenant = new Date();
  const pdf = await pdfCommandeJoma(recap, maintenant, { copie, passeeLe });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="commande-joma-${passeeLe ?? versChampDate(maintenant)}${copie ? "-copie" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
