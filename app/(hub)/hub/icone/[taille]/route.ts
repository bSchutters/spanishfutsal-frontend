import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

/**
 * Les icones de l'application Hub, rendues depuis le blason du club a la
 * taille demandee. Avec `?fond=1`, le blason est pose sur un disque de la
 * couleur du Hub, ce que demandent les icones « maskable » d'Android.
 */
const BLASON = path.join(process.cwd(), "public", "assets", "images", "svg", "logo-asturiana.svg");
const TAILLES = new Set([180, 192, 512]);
const FOND = "#0d1c2e";

export async function GET(request: NextRequest, { params }: { params: Promise<{ taille: string }> }) {
  const { taille } = await params;
  const cote = Number(taille);
  if (!TAILLES.has(cote)) return new NextResponse("Taille inconnue", { status: 404 });
  const avecFond = request.nextUrl.searchParams.get("fond") === "1";

  const blason = await readFile(BLASON);
  // Avec fond, le blason occupe les deux tiers : la zone sure des icones masquees.
  const coteBlason = avecFond ? Math.round(cote * 0.66) : cote;
  const image = await sharp(blason).resize(coteBlason, coteBlason, { fit: "inside" }).png().toBuffer();
  const png = avecFond
    ? await sharp({ create: { width: cote, height: cote, channels: 4, background: FOND } })
        .composite([{ input: image, gravity: "centre" }])
        .png()
        .toBuffer()
    : image;

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
