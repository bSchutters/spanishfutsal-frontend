import type { Metadata } from "next";

import { EnTetePage, Vide } from "@/components/hub/mise-en-page";
import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Calendrier" };

/** Emplacement du module Calendrier, livre au lot suivant. */
export default async function PageCalendrier() {
  await exigerModule("calendar");

  return (
    <>
      <EnTetePage titre="Calendrier" description="Événements du club, posts à publier, matchs et entraînements." />
      <Vide>Le calendrier arrive au prochain lot.</Vide>
    </>
  );
}
