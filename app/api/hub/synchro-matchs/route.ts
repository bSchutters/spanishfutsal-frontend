import { NextResponse, type NextRequest } from "next/server";

import { reconcilierMatchs } from "@/hub/matchs/synchro";
import { nettoyerVisuels } from "@/hub/visuels/menage";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * La reconciliation quotidienne des matchs du Hub, a appeler par le cron
 * externe une fois par jour, apres l'import LFFS. Elle resynchronise chaque
 * match de la saison active et annule les evenements dont le match a
 * disparu : ce que les crochets de la collection Matchs auraient manque.
 * Elle fait aussi le menage des visuels des posts publies depuis quinze jours.
 *
 * Meme protection que l'import : le secret du cron, ou un administrateur
 * connecte pour un lancement a la main.
 */
async function autorise(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  try {
    const payload = await getPayloadClient();
    const { user } = await payload.auth({ headers: request.headers });
    return user?.role === "admin";
  } catch {
    return false;
  }
}

async function reconcilier(request: NextRequest) {
  if (!(await autorise(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await getPayloadClient();
    const bilan = await reconcilierMatchs(payload);
    const visuels = await nettoyerVisuels(payload);
    return NextResponse.json({ success: true, ...bilan, visuels });
  } catch (erreur) {
    console.error("Hub : reconciliation des matchs echouee", erreur);
    return NextResponse.json({ error: erreur instanceof Error ? erreur.message : "Unknown error" }, { status: 500 });
  }
}

export const GET = reconcilier;
export const POST = reconcilier;
