import { NextResponse, type NextRequest } from "next/server";

import { peutEditer } from "@/hub/droits";
import { lireSession } from "@/hub/session";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

/** Une photo de joueur ne depasse pas ce poids avant conversion. */
const POIDS_MAX = 15 * 1024 * 1024;

/**
 * Le depot d'une photo de joueur depuis la fiche du Hub. Le fichier va dans
 * la collection Medias du site, qui le convertit en WebP et le borne a
 * 1920 px comme pour toute image du site. Le droit est celui du module
 * Joueurs en edition ; l'ecriture se fait ensuite en systeme, la matrice
 * des droits de l'admin n'ayant pas a etre ouverte pour cela.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session || !peutEditer(session.user, "players")) {
    return NextResponse.json({ erreur: "Vous n'avez pas le droit de modifier l'effectif." }, { status: 403 });
  }

  let corps: FormData;
  try {
    corps = await request.formData();
  } catch {
    return NextResponse.json({ erreur: "Fichier illisible." }, { status: 400 });
  }
  const fichier = corps.get("file");
  const alt = String(corps.get("alt") ?? "").trim();
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ erreur: "Aucun fichier." }, { status: 400 });
  }
  if (!fichier.type.startsWith("image/")) {
    return NextResponse.json({ erreur: "Une image, pas autre chose." }, { status: 415 });
  }
  if (fichier.size > POIDS_MAX) {
    return NextResponse.json({ erreur: "La photo est trop lourde, 15 Mo au plus." }, { status: 413 });
  }

  try {
    const payload = await getPayloadClient();
    const doc = await payload.create({
      collection: "media",
      data: { alt: alt || fichier.name },
      file: {
        data: Buffer.from(await fichier.arrayBuffer()),
        mimetype: fichier.type,
        name: fichier.name,
        size: fichier.size,
      },
      depth: 0,
    });
    return NextResponse.json({ id: Number(doc.id), url: String(doc.url ?? "") });
  } catch (erreur) {
    console.error("Hub : depot d'une photo de joueur echoue", erreur);
    return NextResponse.json({ erreur: "Le dépôt a échoué." }, { status: 500 });
  }
}
