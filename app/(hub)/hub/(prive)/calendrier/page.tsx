import type { Metadata } from "next";

import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Calendrier" };

/** Emplacement du module Calendrier, livre au lot suivant. */
export default async function PageCalendrier() {
  await exigerModule("calendar");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">Calendrier</h1>
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
        Le calendrier arrive au prochain lot.
      </p>
    </div>
  );
}
