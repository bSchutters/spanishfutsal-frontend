import { NextResponse, type NextRequest } from "next/server";

import { envoyerRappels } from "@/hub/rappels/envoi";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le job des rappels push, a appeler par le cron externe toutes les cinq
 * minutes. Il envoie les rappels dont l'heure tombe dans les dix dernieres
 * minutes, une seule fois chacun grace au journal. Meme protection que
 * l'import : le secret du cron, ou un administrateur connecte.
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

async function lancer(request: NextRequest) {
  if (!(await autorise(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await getPayloadClient();
    const bilan = await envoyerRappels(payload);
    return NextResponse.json({ success: true, ...bilan });
  } catch (erreur) {
    console.error("Hub : job des rappels echoue", erreur);
    return NextResponse.json({ error: erreur instanceof Error ? erreur.message : "Unknown error" }, { status: 500 });
  }
}

export const GET = lancer;
export const POST = lancer;
