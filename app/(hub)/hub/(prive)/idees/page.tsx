import type { Metadata } from "next";

import { EnTetePage, Vide } from "@/components/hub/mise-en-page";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Idées" };

/** Emplacement du tableau des idees, livre au lot 5. */
export default async function PageIdees() {
  await exigerModule("calendar");

  return (
    <>
      <EnTetePage titre="Idées" description="Les idées de contenu, en tickets à voter et à planifier." />
      <Vide>Le tableau des idées arrive avec le lot 5.</Vide>
    </>
  );
}
