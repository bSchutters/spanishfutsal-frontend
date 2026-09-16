import type { Metadata } from "next";
import { headers } from "next/headers";

import TableauIdees from "@/components/hub/idees/tableau-idees";
import { EnTetePage } from "@/components/hub/mise-en-page";
import { chargerReferences } from "@/hub/calendrier/donnees";
import { estAdmin, peutEditer } from "@/hub/droits";
import { listerIdees, listerMatchs } from "@/hub/idees/donnees";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Idées" };

/** Un telephone ou une tablette en main : un onglet par colonne et un bouton flottant. */
function estMobile(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
}

/**
 * Le tableau des idees. Les references du calendrier servent au bouton
 * « Planifier », qui ouvre le formulaire d'un post pre-rempli.
 */
export default async function PageIdees() {
  const { user } = await exigerModule("calendar");
  const [idees, matchs, references, entetes] = await Promise.all([
    listerIdees(user),
    listerMatchs(user),
    chargerReferences(user),
    headers(),
  ]);

  return (
    <>
      <EnTetePage titre="Idées" description="Les idées de contenu, en tickets à voter et à planifier." />
      <TableauIdees
        idees={idees}
        references={{ reseaux: references.reseaux, formats: references.formats, matchs }}
        referencesCalendrier={references}
        peutEditer={peutEditer(user, "calendar")}
        utilisateurId={Number(user.id)}
        estAdmin={estAdmin(user)}
        mobile={estMobile(entetes.get("user-agent") ?? "")}
      />
    </>
  );
}
