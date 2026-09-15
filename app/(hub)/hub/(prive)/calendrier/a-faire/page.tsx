import type { Metadata } from "next";

import { EnTetePage, Vide } from "@/components/hub/mise-en-page";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "À faire" };

/** Emplacement de la vue des posts a publier, livree au lot suivant. */
export default async function PageAFaire() {
  await exigerModule("calendar");

  return (
    <>
      <EnTetePage titre="À faire" description="Les posts à créer ou à publier, les retards en premier." />
      <Vide>La liste des posts à publier arrive au prochain lot.</Vide>
    </>
  );
}
