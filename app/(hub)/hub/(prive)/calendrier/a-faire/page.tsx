import type { Metadata } from "next";

import { exigerModule } from "@/hub/session";

export const metadata: Metadata = { title: "À faire" };

/** Emplacement de la vue « À faire », livree au lot suivant. */
export default async function PageAFaire() {
  await exigerModule("calendar");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-marjorie text-3xl font-black uppercase italic text-spanish-accent-2">À faire</h1>
      <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
        La liste des posts à publier arrive au prochain lot.
      </p>
    </div>
  );
}
