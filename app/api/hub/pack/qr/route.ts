import { NextResponse, type NextRequest } from "next/server";

import { peutEditer } from "@/hub/droits";
import { baseUrlHub } from "@/hub/flux/base-url";
import { qrPng } from "@/hub/flux/qr";
import { chargerReglagesPack } from "@/hub/pack/donnees";
import { lireSession } from "@/hub/session";

export const dynamic = "force-dynamic";

/**
 * Le QR code de la page des joueurs, au blason du club comme ceux des flux.
 * Il suit toujours le lien du moment : apres un nouveau lien, il faut le
 * telecharger a nouveau. Reserve a qui peut editer le Pack.
 */
export async function GET(request: NextRequest) {
  const session = await lireSession();
  if (!session || !peutEditer(session.user, "pack")) {
    return NextResponse.json({ erreur: "Réservé à qui peut éditer le pack." }, { status: 403 });
  }
  const { jeton } = await chargerReglagesPack();
  const png = await qrPng(`${baseUrlHub()}/pack/${jeton}`);
  const telecharger = request.nextUrl.searchParams.get("telecharger") === "1";
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename="pack-ud-asturiana.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
