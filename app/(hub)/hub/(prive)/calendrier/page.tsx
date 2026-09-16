import type { Metadata } from "next";

import Calendrier from "@/components/hub/calendrier/calendrier";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { chargerReferences } from "@/hub/calendrier/donnees";
import { estAdmin, peutEditer } from "@/hub/droits";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Calendrier" };

export default async function PageCalendrier() {
  const { user } = await exigerModule("calendar");
  const references = await chargerReferences(user);

  return (
    <>
      <EnTetePage titre="Calendrier" description="Événements du club, posts à publier, matchs et entraînements." />
      <Calendrier
        references={references}
        peutEditer={peutEditer(user, "calendar")}
        utilisateurId={Number(user.id)}
        estAdmin={estAdmin(user)}
      />
    </>
  );
}
