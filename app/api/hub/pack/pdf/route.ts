import { NextResponse, type NextRequest } from "next/server";

import { versChampDate } from "@/hub/dates";
import { peutEditer } from "@/hub/droits";
import { recapJoma } from "@/hub/pack/calculs";
import { chargerCommandes, listerArticles } from "@/hub/pack/donnees";
import { pdfCommandeJoma } from "@/hub/pack/pdf";
import { lireSession } from "@/hub/session";

export const dynamic = "force-dynamic";

/**
 * Le PDF de la commande Joma pour les commandes cochees dans le Hub, sans
 * les articles ecartes. Reserve a qui peut editer le Pack : c'est le
 * document qui part chez le fournisseur.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session || !peutEditer(session.user, "pack")) {
    return NextResponse.json({ erreur: "Réservé à qui peut éditer le pack." }, { status: 403 });
  }

  let corps: { ids?: unknown; ecartes?: unknown };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const ids = Array.isArray(corps.ids) ? corps.ids.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, 500) : [];
  const ecartes = Array.isArray(corps.ecartes) ? corps.ecartes.filter((e): e is string => typeof e === "string") : [];
  if (ids.length === 0) return NextResponse.json({ erreur: "Aucune commande cochée." }, { status: 400 });

  const [commandes, catalogue] = await Promise.all([chargerCommandes(ids), listerArticles({ actifsSeulement: false })]);
  const recap = recapJoma(commandes, new Set(ecartes), (nom) => catalogue.find((a) => a.nom === nom)?.tailles ?? []);
  if (recap.pieces === 0) return NextResponse.json({ erreur: "Rien à commander dans cette sélection." }, { status: 400 });

  const maintenant = new Date();
  const pdf = await pdfCommandeJoma(recap, maintenant);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="commande-joma-${versChampDate(maintenant)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
