"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { PastilleStatut } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { changerStatut } from "@/hub/actions/evenements";
import { COULEURS_STATUT, LIBELLES_STATUT, type Statut } from "@/hub/calendrier/schema";
import SelecteurStatut from "./selecteur-statut";

/** Les actions rapides d'un post a faire : statut, legende, visuels. */
export default function ActionsPost({
  id,
  statut,
  legende,
  lienVisuels,
  peutEditer,
}: {
  id: number;
  statut: Statut;
  legende: string;
  lienVisuels: string;
  peutEditer: boolean;
}) {
  const router = useRouter();
  const [enCours, lancer] = useTransition();

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(legende);
      toast.success("Légende copiée.");
    } catch {
      toast.error("Impossible de copier.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {peutEditer ? (
        <SelecteurStatut
          valeur={statut}
          disabled={enCours}
          onChange={(nouveau) =>
            lancer(async () => {
              const r = await changerStatut({ id, statut: nouveau });
              if (!r.ok) return void toast.error(r.erreur);
              router.refresh();
            })
          }
        />
      ) : (
        <span className="text-sm">
          <PastilleStatut couleur={COULEURS_STATUT[statut]} libelle={LIBELLES_STATUT[statut]} />
        </span>
      )}
      {legende ? (
        <Button type="button" variant="hubSecondary" size="sm" onClick={copier}>
          <Copy aria-hidden="true" />
          Légende
        </Button>
      ) : null}
      {lienVisuels ? (
        <Button variant="hubSecondary" size="sm" asChild>
          <a href={lienVisuels} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            Visuels
          </a>
        </Button>
      ) : null}
    </div>
  );
}
