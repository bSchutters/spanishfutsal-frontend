import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { seDeconnecter } from "@/hub/actions/session";

/** Un formulaire d'une seule action : la deconnexion se fait cote serveur. */
export default function BoutonDeconnexion({ libelle = "Se déconnecter" }: { libelle?: string }) {
  return (
    <form action={seDeconnecter}>
      <Button type="submit" variant="secondary">
        <LogOut aria-hidden="true" />
        {libelle}
      </Button>
    </form>
  );
}
