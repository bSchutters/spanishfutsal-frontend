"use client";

import { FileVideo, ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Visuel } from "@/hub/calendrier/donnees";

/**
 * Le depot des visuels d'un post, depuis le formulaire. Chaque fichier
 * part tel quel vers la collection hub-media, par l'API de Payload avec la
 * session en cours ; rien n'est converti. Le formulaire ne garde que les
 * identifiants, le panneau relit le reste.
 */
export default function VisuelsUpload({
  valeurs,
  visuels,
  onChange,
}: {
  /** Les identifiants retenus par le formulaire. */
  valeurs: number[];
  /** Les visuels deja connus, pour les vignettes. */
  visuels: Visuel[];
  onChange: (ids: number[], visuels: Visuel[]) => void;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(0);

  const deposer = async (fichiers: FileList | null) => {
    if (!fichiers || fichiers.length === 0) return;
    setEnCours(fichiers.length);
    let ids = [...valeurs];
    let connus = [...visuels];
    for (const fichier of Array.from(fichiers)) {
      try {
        const corps = new FormData();
        corps.append("file", fichier, fichier.name);
        corps.append("_payload", JSON.stringify({}));
        const reponse = await fetch("/api/hub-media", { method: "POST", body: corps, credentials: "include" });
        if (!reponse.ok) throw new Error(`${reponse.status}`);
        const json = (await reponse.json()) as { doc: Record<string, unknown> };
        const d = json.doc;
        const vignette = (d.sizes as { vignette?: { url?: string | null } } | undefined)?.vignette?.url ?? null;
        const visuel: Visuel = {
          id: Number(d.id),
          nom: String(d.filename ?? fichier.name),
          type: String(d.mimeType ?? fichier.type),
          taille: Number(d.filesize ?? fichier.size),
          url: String(d.url ?? ""),
          urlVignette: vignette,
        };
        ids = [...ids, visuel.id];
        connus = [...connus, visuel];
        onChange(ids, connus);
      } catch (erreur) {
        toast.error(`« ${fichier.name} » n'a pas pu être déposé${erreur instanceof Error && erreur.message === "413" ? " : trop lourd" : ""}.`);
      } finally {
        setEnCours((n) => n - 1);
      }
    }
    if (entree.current) entree.current.value = "";
  };

  const retirer = (id: number) => {
    onChange(
      valeurs.filter((v) => v !== id),
      visuels.filter((v) => v.id !== id),
    );
  };

  const retenus = valeurs.map((id) => visuels.find((v) => v.id === id)).filter((v): v is Visuel => !!v);

  return (
    <div className="flex flex-col gap-2">
      {retenus.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {retenus.map((v) => (
            <li key={v.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-secondary/40">
              {v.urlVignette || v.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.urlVignette ?? v.url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-1 px-1 text-center text-[11px] text-muted-foreground">
                  <FileVideo className="size-5" aria-hidden="true" />
                  <span className="line-clamp-2 break-all">{v.nom}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => retirer(v.id)}
                aria-label={`Retirer ${v.nom}`}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground opacity-80 hover:opacity-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={entree}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => void deposer(e.target.files)}
        />
        <Button type="button" variant="hubSecondary" size="sm" disabled={enCours > 0} onClick={() => entree.current?.click()}>
          {enCours > 0 ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {enCours > 0 ? `Dépôt en cours (${enCours})…` : "Ajouter des visuels"}
        </Button>
        <span className="text-xs text-muted-foreground">Images et vidéos, gardées telles quelles.</span>
      </div>
    </div>
  );
}
