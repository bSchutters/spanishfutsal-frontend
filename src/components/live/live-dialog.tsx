"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

import { useLiveStore } from "@/store/useLiveStore";
import YoutubePlayer from "./youtube-player";

/**
 * Le lecteur, par-dessus la page.
 *
 * Aucune facade ici : le visiteur a deja clique sur « Regarder », son intention
 * est faite. Le lecteur s'installe donc directement, ce qui ramene le match a
 * un seul clic. Rien de YouTube n'est charge tant que la surimpression est
 * fermee, puisque le cadre n'est monte qu'a l'ouverture.
 *
 * L'element `dialog` natif apporte le piegeage du clavier, la fermeture par
 * Echap, le retour du focus et l'inertie du reste de la page. Les reecrire a la
 * main est le nid a defauts d'accessibilite habituel des surimpressions.
 */
export default function LiveDialog() {
  const live = useLiveStore((s) => s.live);
  const isOpen = useLiveStore((s) => s.isOpen);
  const close = useLiveStore((s) => s.close);
  const cadre = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogue = cadre.current;
    if (!dialogue) return;

    if (isOpen && !dialogue.open) dialogue.showModal();
    if (!isOpen && dialogue.open) dialogue.close();
    // `videoId` en dependance : l'element n'est rendu qu'une fois la diffusion
    // connue, et sans cela l'effet ne repasserait jamais a son apparition.
  }, [isOpen, live?.videoId]);

  useEffect(() => {
    const dialogue = cadre.current;
    if (!dialogue) return;

    // Ecoute directe plutot que `onClose` : l'evenement `close` ne remonte pas
    // et React ne le relaie pas. Sans cela, une fermeture par Echap laissait le
    // cadre monte, donc le son du match, et la page verrouillee au defilement.
    const surFermeture = () => close();
    dialogue.addEventListener("close", surFermeture);

    return () => dialogue.removeEventListener("close", surFermeture);
  }, [close, live?.videoId]);

  useEffect(() => {
    if (!isOpen) return;

    // `showModal` rend le reste de la page inerte mais ne verrouille pas son
    // defilement, qui continue de filer derriere la surimpression.
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = precedent;
    };
  }, [isOpen]);

  if (!live?.videoId) return null;

  const affiche = live.match
    ? `${live.match.homeTeam} - ${live.match.awayTeam}`
    : "Match en direct";

  return (
    <dialog
      ref={cadre}
      onClick={(e) => {
        // Le clic sur le fond, c'est-a-dire sur l'element lui-meme et non sur
        // son contenu, referme la surimpression.
        if (e.target === cadre.current) close();
      }}
      aria-label={`Diffusion en direct, ${affiche}`}
      className="m-auto w-[min(96vw,1120px)] rounded-xl bg-spanish-bg-dark p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        {/* La pastille du direct vit dans la barre du lecteur, ou elle est a sa
            place. L'ecrire ici aussi la doublonnait a deux centimetres. */}
        <p className="text-sm font-semibold uppercase">{affiche}</p>

        {live.viewers !== null && (
          <span className="hidden text-xs tabular-nums opacity-80 sm:inline">
            {new Intl.NumberFormat("fr-BE").format(live.viewers)}{" "}
            {live.viewers > 1 ? "spectateurs" : "spectateur"}
          </span>
        )}

        <button
          type="button"
          onClick={close}
          aria-label="Fermer le lecteur"
          className="ms-auto flex size-9 cursor-pointer items-center justify-center rounded-md bg-spanish-bg-lighter/40 transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-bg-lighter active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {/* Monte a l'ouverture seulement : rien de YouTube n'est charge avant,
          et la fermeture demonte le lecteur, ce qui coupe le son. */}
      {isOpen && <YoutubePlayer videoId={live.videoId} url={live.url} />}

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
        <span className="opacity-80">
          {live.match ? `${live.match.competition} · ${live.match.time}` : ""}
        </span>

        {/* Sortie de secours : une chaine peut refuser l'integration, et le
            cadre n'affiche alors qu'un message d'erreur de YouTube. */}
        <a
          href={live.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent"
        >
          Ouvrir sur YouTube
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </dialog>
  );
}
