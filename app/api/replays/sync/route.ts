import { NextRequest, NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";
import { balayerLesDiffusions } from "@/lib/rapportDeDiffusion";
import { rattraperLesReplays } from "@/lib/trouverLesReplays";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le rattrapage du matin, declenche de trois facons.
 *
 * - le cron de Vercel, une fois par jour, en GET avec le secret ;
 * - un administrateur connecte, en POST, pour ne pas attendre demain ;
 * - la ligne de commande, avec le meme secret que le cron.
 *
 * Les droits suivent exactement ceux de l'import de la federation : ce sont les
 * deux seules taches de fond du site, les faire divergerait pour rien.
 */

function autoriseParLeSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function estAdministrateur(request: NextRequest): Promise<boolean> {
  try {
    const payload = await getPayloadClient();
    const { user } = await payload.auth({ headers: request.headers });
    return user?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Le rattrapage du matin, celui de tout ce que la soiree a pu manquer.
 *
 * Deux taches, pour la meme raison : elles reparent apres coup ce qui depend de
 * la presence de quelqu un sur le site. Le replay parce que la mise en ligne
 * arrive le lendemain, le rapport d audience parce que la fin d une diffusion
 * n est constatee que par un visiteur encore present.
 */
async function executer() {
  const rapport = await rattraperLesReplays();
  const clotures = await balayerLesDiffusions();

  return NextResponse.json(
    { ...rapport, diffusionsExaminees: clotures },
    { status: rapport.erreur ? 502 : 200 },
  );
}

export async function GET(request: NextRequest) {
  if (!autoriseParLeSecret(request)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  return executer();
}

export async function POST(request: NextRequest) {
  if (autoriseParLeSecret(request) || (await estAdministrateur(request))) {
    return executer();
  }

  return NextResponse.json({ error: "Non autorise" }, { status: 401 });
}
