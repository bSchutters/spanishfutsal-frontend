"use client";

import { Download, FileVideo, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Visuel } from "@/hub/calendrier/donnees";

const tailleLisible = (octets: number) =>
  octets >= 1_048_576 ? `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`;

/**
 * Les visuels d'un post, avec de quoi les recuperer en pleine qualite. Sur
 * un telephone qui sait partager des fichiers, le bouton ouvre la feuille de
 * partage du systeme, ou « Enregistrer l'image » range le fichier dans la
 * galerie ; ailleurs, c'est un telechargement classique du fichier d'origine.
 */
export default function GalerieVisuels({ visuels }: { visuels: Visuel[] }) {
  const [enCours, setEnCours] = useState<number | null>(null);
  const peutPartager = typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  const partager = async (v: Visuel) => {
    setEnCours(v.id);
    try {
      const reponse = await fetch(v.url, { credentials: "include" });
      if (!reponse.ok) throw new Error(String(reponse.status));
      const fichier = new File([await reponse.blob()], v.nom, { type: v.type || undefined });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: v.nom });
      } else {
        const lien = document.createElement("a");
        lien.href = URL.createObjectURL(fichier);
        lien.download = v.nom;
        lien.click();
        setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
      }
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === "AbortError") return;
      toast.error("Impossible de récupérer ce fichier. Ouvrez-le et enregistrez-le à la main.");
    } finally {
      setEnCours(null);
    }
  };

  if (visuels.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3">
      {visuels.map((v) => (
        <li key={v.id} className="flex flex-col gap-2">
          {/* L'image entiere, jamais recadree : une affiche ou une story se lit en un coup d'oeil. */}
          <a
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-h-72 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/40"
            title="Ouvrir l'original"
          >
            {v.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.urlVignette ?? v.url} alt={v.nom} className="max-h-72 w-full object-contain" />
            ) : (
              <span className="flex aspect-square w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted-foreground">
                <FileVideo className="size-6" aria-hidden="true" />
                <span className="line-clamp-2 break-all">{v.nom}</span>
              </span>
            )}
          </a>
          <p className="truncate text-[11px] text-muted-foreground" title={v.nom}>
            {v.nom} · {tailleLisible(v.taille)}
          </p>
          <Button
            type="button"
            variant="hubSecondary"
            size="sm"
            className="w-full"
            disabled={enCours === v.id}
            onClick={() => void partager(v)}
            aria-label={peutPartager ? `Enregistrer ${v.nom}` : `Télécharger ${v.nom}`}
          >
            {peutPartager ? <Share2 aria-hidden="true" /> : <Download aria-hidden="true" />}
            {peutPartager ? "Enregistrer" : "Télécharger"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
