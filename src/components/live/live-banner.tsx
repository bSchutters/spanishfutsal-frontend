"use client";

import { useEffect, useRef } from "react";

import { useLiveStore } from "@/store/useLiveStore";

// Si la route ne dit rien, on repasse dans un quart d'heure.
const RAPPEL_DEFAUT = 900;

// En dessous de dix, le compteur dessert la diffusion plus qu'il ne la sert :
// il est alors tu, et la place revient a l'affiche. Le filtre est pose ici,
// a l'entree, pour que le bandeau et le lecteur ne se contredisent jamais.
const SEUIL_SPECTATEURS = 10;

/**
 * Le bandeau du direct, monte dans la navigation, donc present sur toutes les
 * pages. Le direct est un etat du club et non d'une page : quelqu'un qui arrive
 * sur le classement doit voir que le match est en cours.
 *
 * C'est aussi le seul endroit qui interroge la route. Elle repond avec le delai
 * avant la prochaine verification, ce qui evite d'appeler toutes les minutes,
 * jour et nuit, pour une rencontre par semaine.
 */
export default function LiveBanner() {
  const live = useLiveStore((s) => s.live);
  const setLive = useLiveStore((s) => s.setLive);
  const setHauteurBandeau = useLiveStore((s) => s.setHauteurBandeau);
  const ouvrir = useLiveStore((s) => s.ouvrir);
  const bandeau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let arrete = false;
    let minuteur: ReturnType<typeof setTimeout>;

    const verifier = async () => {
      let rappel = RAPPEL_DEFAUT;

      try {
        const res = await fetch("/api/live-status");

        if (res.ok) {
          const data = await res.json();
          rappel = data.nextCheckIn ?? RAPPEL_DEFAUT;

          if (!arrete) {
            setLive(
              data.live
                ? {
                    url: data.url,
                    videoId: data.videoId ?? null,
                    hlsUrl: data.hlsUrl ?? null,
                    viewers:
                      typeof data.viewers === "number" &&
                      data.viewers >= SEUIL_SPECTATEURS
                        ? data.viewers
                        : null,
                    match: data.match ?? null,
                  }
                : null,
            );
          }
        }
      } catch {
        // Hors ligne ou route indisponible : on garde l'etat precedent plutot
        // que de faire disparaitre un bandeau deja affiche.
      }

      if (!arrete) minuteur = setTimeout(verifier, rappel * 1000);
    };

    verifier();

    return () => {
      arrete = true;
      clearTimeout(minuteur);
    };
  }, [setLive]);

  useEffect(() => {
    const element = bandeau.current;
    if (!element) return;

    // La navigation est fixe : le bandeau qu'elle porte ne pousse rien. Sa
    // hauteur est donc mesuree ici et reportee par un cale-pied dans le flux,
    // faute de quoi le haut de chaque page passe dessous. Elle est mesuree
    // plutot que devinee : le bandeau se replie sur deux lignes en petite
    // largeur.
    const observateur = new ResizeObserver(([entree]) =>
      setHauteurBandeau(entree.contentRect.height),
    );
    observateur.observe(element);

    return () => {
      observateur.disconnect();
      setHauteurBandeau(0);
    };
  }, [live, setHauteurBandeau]);

  if (!live) return null;

  const affiche = live.match
    ? `${live.match.homeTeam} - ${live.match.awayTeam}`
    : "Match en cours";

  const habillageAction =
    "ms-auto shrink-0 rounded-md border-2 border-red-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700 transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-red-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      ref={bandeau}
      // Une seule ligne, toujours. En petite largeur le repli donnait trois
      // lignes empilees et un bandeau plus haut que la navigation. C'est
      // l'affiche qui cede, en se tronquant.
      //
      // Le blason de la navigation deborde sous la barre : le contenu commence
      // apres lui, faute de quoi il passerait dessous.
      className="flex items-center gap-3 bg-red-600 py-2 pe-3 ps-28 text-white sm:gap-4 sm:pe-8 md:ps-32"
    >
      <span className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase italic">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute size-2 rounded-full bg-white" />
          <span className="absolute size-2 animate-ping rounded-full bg-white" />
        </span>
        en direct
      </span>

      {/* Sous 640 px, le blason de la navigation mange cent douze pixels et il
          ne reste pas de quoi lire une affiche : tronquee, elle ne disait plus
          rien. L'essentiel tient sans elle, et la carte du match la porte. */}
      <span className="hidden min-w-0 truncate text-sm font-semibold sm:block">
        {affiche}
      </span>

      {live.viewers !== null && (
        <span className="hidden shrink-0 text-xs tabular-nums lg:inline">
          {new Intl.NumberFormat("fr-BE").format(live.viewers)}{" "}
          {live.viewers > 1 ? "spectateurs" : "spectateur"}
        </span>
      )}

      {live.hlsUrl || live.videoId ? (
        <button
          type="button"
          onClick={() =>
            ouvrir({
              mode: live.hlsUrl ? "hls" : "direct",
              videoId: (live.videoId ?? "") as string,
              hlsUrl: live.hlsUrl,
              url: live.url,
              affiche,
              contexte: live.match
                ? `${live.match.competition} · ${live.match.time}`
                : null,
              viewers: live.viewers,
            })
          }
          className={habillageAction}
        >
          Regarder
        </button>
      ) : (
        // Diffusion hors YouTube : elle ne s'ouvre pas dans le lecteur du site.
        <a
          href={live.url}
          target="_blank"
          rel="noreferrer"
          className={habillageAction}
        >
          Regarder
        </a>
      )}
    </div>
  );
}
