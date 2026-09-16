import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";

import BoutonCopier from "@/components/hub/bouton-copier";
import { Pastille } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { enWebcal, lienGoogleAgenda, urlFlux } from "@/hub/flux/base-url";
import { chargerFluxParJeton } from "@/hub/flux/donnees";

export const metadata: Metadata = { title: "S'abonner au calendrier" };

type Appareil = "apple" | "android" | "autre";

function detecterAppareil(userAgent: string): Appareil {
  if (/iPhone|iPad|iPod|Macintosh/i.test(userAgent)) return "apple";
  if (/Android/i.test(userAgent)) return "android";
  return "autre";
}

/**
 * La page qu ouvre un QR code ou un lien partage : un bouton pour ajouter le
 * flux au calendrier du telephone, adapte a l appareil. Publique par son
 * jeton, jamais indexee. Un jeton inconnu : 404, sans autre detail.
 */
export default async function PageAbonnement({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const flux = await chargerFluxParJeton(decodeURIComponent(token));
  if (!flux) notFound();

  const appareil = detecterAppareil((await headers()).get("user-agent") ?? "");
  const lienIcs = urlFlux(flux.token);
  const lienApple = enWebcal(lienIcs);
  const lienGoogle = lienGoogleAgenda(lienIcs);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/assets/images/svg/logo-asturiana.svg" alt="" width={44} height={44} className="size-11" priority />
            <div className="leading-tight">
              <p className="text-base font-semibold">UD Asturiana</p>
              <p className="text-xs text-muted-foreground">Calendrier du club</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Pastille couleur={flux.color} />
              <h1 className="text-lg font-semibold">{flux.name}</h1>
            </div>
            {flux.description ? <p className="mt-2 text-sm text-muted-foreground">{flux.description}</p> : null}

            <div className="mt-5 flex flex-col gap-3">
              {appareil !== "android" ? (
                <Button variant="hub" className="h-11 w-full" asChild>
                  <a href={lienApple}>
                    <CalendarPlus aria-hidden="true" />
                    Ajouter à Calendrier
                  </a>
                </Button>
              ) : null}
              {appareil !== "apple" ? (
                <Button variant={appareil === "android" ? "hub" : "hubSecondary"} className="h-11 w-full" asChild>
                  <a href={lienGoogle} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus aria-hidden="true" />
                    Ajouter à Google Agenda
                  </a>
                </Button>
              ) : null}
              <BoutonCopier valeur={lienIcs} />
            </div>

            <div className="mt-5 flex flex-col gap-2 text-xs text-muted-foreground">
              {appareil === "apple" && flux.alarms ? (
                <p>
                  Au moment de l&apos;ajout, décochez « Supprimer les alertes » pour recevoir les rappels du flux.
                </p>
              ) : null}
              {appareil === "android" ? (
                <p>
                  Google Agenda ouvre dans le navigateur : confirmez l&apos;ajout, le calendrier apparaît ensuite dans
                  l&apos;application. La mise à jour peut prendre plusieurs heures.
                </p>
              ) : null}
              <p>Ce calendrier se met à jour automatiquement. Il est en lecture seule.</p>
            </div>
          </div>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted-foreground">UD Asturiana</p>
    </main>
  );
}
