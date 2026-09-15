import type { Metadata } from "next";

import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "Idées" };

/** Emplacement du tableau des idees, livre au lot 5. */
export default async function PageIdees() {
  await exigerModule("calendar");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">Idées</h1>
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
        Le tableau des idées arrive avec le lot 5.
      </p>
    </div>
  );
}
