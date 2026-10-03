import Link from "next/link";

import { cn } from "@/lib/utils";

/** Les deux pages du Pack, en bascule dans l'en-tete, comme Tous / Mes posts dans À faire. */
export default function OngletsPack({ actif }: { actif: "commandes" | "catalogue" }) {
  const onglet = (cle: typeof actif, href: string, libelle: string) => (
    <Link
      href={href}
      aria-current={actif === cle ? "page" : undefined}
      className={cn("rounded px-2.5 py-1", actif === cle ? "bg-secondary font-medium" : "text-muted-foreground")}
    >
      {libelle}
    </Link>
  );
  return (
    <div className="flex gap-1 rounded-md border border-border p-0.5 text-sm">
      {onglet("commandes", "/hub/pack", "Commandes")}
      {onglet("catalogue", "/hub/pack/catalogue", "Catalogue")}
    </div>
  );
}
