import type { Metadata } from "next";
import { headers } from "next/headers";

import Calendrier from "@/components/hub/calendrier/calendrier";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { chargerReferences } from "@/hub/calendrier/donnees";
import { estAdmin, peutEditer } from "@/hub/droits";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Calendrier" };

/** Un telephone ou une tablette en main : la liste d'abord, decide ici, avant tout rendu. */
function estMobile(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
}

export default async function PageCalendrier() {
  const { user } = await exigerModule("calendar");
  const [references, entetes] = await Promise.all([chargerReferences(user), headers()]);

  return (
    <>
      <EnTetePage titre="Calendrier" description="Événements du club, posts à publier, matchs et entraînements." />
      <Calendrier
        references={references}
        peutEditer={peutEditer(user, "calendar")}
        utilisateurId={Number(user.id)}
        estAdmin={estAdmin(user)}
        mobile={estMobile(entetes.get("user-agent") ?? "")}
      />
    </>
  );
}
