"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

/**
 * Le lecteur du club, sur l'image de YouTube.
 *
 * Recuperer le flux pour le jouer dans notre propre balise video contreviendrait
 * aux conditions de YouTube et mettrait la chaine en risque. L'API IFrame, elle,
 * est la voie prevue : elle masque les commandes natives et laisse piloter la
 * lecture depuis les notres. La surface reste leur cadre, tout ce qui l'entoure
 * est a nous.
 */

type Lecteur = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (valeur: number) => void;
  destroy: () => void;
};

type ApiYouTube = {
  Player: new (
    hote: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => Lecteur;
};

declare global {
  interface Window {
    YT?: ApiYouTube;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const EN_LECTURE = 1;

// Hauteur rognee en haut et en bas, assez pour avaler les bandeaux de YouTube.
const MARGE = 90;

let apiChargee: Promise<ApiYouTube> | null = null;

/** Le script n'est telecharge qu'une fois pour toute la session. */
function chargerApi(): Promise<ApiYouTube> {
  if (apiChargee) return apiChargee;

  apiChargee = new Promise((resoudre) => {
    if (window.YT?.Player) {
      resoudre(window.YT);
      return;
    }

    window.onYouTubeIframeAPIReady = () => resoudre(window.YT as ApiYouTube);

    const balise = document.createElement("script");
    balise.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(balise);
  });

  return apiChargee;
}

export default function YoutubePlayer({
  videoId,
  url,
}: {
  videoId: string;
  url: string;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const lecteur = useRef<Lecteur | null>(null);

  const [pret, setPret] = useState(false);
  const [enLecture, setEnLecture] = useState(true);
  const [muet, setMuet] = useState(true);
  const [volume, setVolume] = useState(100);
  const [erreur, setErreur] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);

  /**
   * Deborde le cadre de YouTube au-dela du notre, de MARGE en haut comme en bas.
   *
   * Leur interface est ancree aux bords de leur lecteur, pas a l'image : titre
   * et nom de chaine en haut, suggestions en bas. En rendant leur cadre plus
   * haut que le notre, la video se cale au centre en 16/9 et occupe exactement
   * notre surface, tandis que leurs bandeaux tombent dans les bandes noires,
   * que le debordement masque. C'est le seul moyen : `controls=0` ne les
   * supprime pas, et ils reviennent a chaque changement d'etat, pas seulement
   * au survol.
   */
  const recadrer = useCallback(() => {
    const cadre = conteneur.current?.querySelector("iframe");
    if (!cadre) return;

    cadre.style.position = "absolute";
    cadre.style.left = "0";
    cadre.style.width = "100%";
    cadre.style.top = `-${MARGE}px`;
    cadre.style.height = `calc(100% + ${MARGE * 2}px)`;
  }, []);

  useEffect(() => {
    let annule = false;

    // L'element est cree a la main : l'API le remplace par son cadre, et React
    // ne doit pas avoir a retirer un noeud qu'il ne trouve plus.
    const hote = document.createElement("div");
    hote.className = "absolute inset-0 h-full w-full";
    conteneur.current?.appendChild(hote);

    chargerApi().then((YT) => {
      if (annule) return;

      lecteur.current = new YT.Player(hote, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          autoplay: 1,
          // Sans son au demarrage : c'est la seule lecture automatique que les
          // navigateurs autorisent sans reserve. Avec le son, Chrome met en
          // pause, et YouTube en profite pour reafficher son interface.
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (annule) return;
            setPret(true);
            recadrer();
            // `autoplay` seul ne suffit pas : le cadre est cree apres le clic,
            // et le navigateur ne lui rattache pas toujours le geste. A l'arret,
            // YouTube reaffiche son titre et son bouton par-dessus les notres.
            lecteur.current?.playVideo();
          },
          onStateChange: (e) => !annule && setEnLecture(e.data === EN_LECTURE),
          // 101 et 150 : la chaine refuse l'integration. Le message vaut mieux
          // qu'un cadre noir sans explication.
          onError: () => !annule && setErreur(true),
        },
      });
    });

    return () => {
      annule = true;
      lecteur.current?.destroy();
      lecteur.current = null;
      hote.remove();
    };
  }, [videoId, recadrer]);

  useEffect(() => {
    const suivre = () => setPleinEcran(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", suivre);

    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  const basculerLecture = useCallback(() => {
    if (!lecteur.current) return;

    if (enLecture) lecteur.current.pauseVideo();
    else lecteur.current.playVideo();
  }, [enLecture]);

  const basculerSon = useCallback(() => {
    if (!lecteur.current) return;

    if (muet) lecteur.current.unMute();
    else lecteur.current.mute();

    setMuet(!muet);
  }, [muet]);

  const changerVolume = useCallback((valeur: number) => {
    setVolume(valeur);
    lecteur.current?.setVolume(valeur);

    // Bouger le curseur remet le son : c'est le geste de quelqu'un qui veut
    // entendre.
    if (valeur > 0) {
      lecteur.current?.unMute();
      setMuet(false);
    }
  }, []);

  const basculerPleinEcran = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else conteneur.current?.requestFullscreen();
  }, []);

  const habillageBouton =
    "flex size-9 cursor-pointer items-center justify-center rounded-md text-white transition-[scale,color] duration-200 ease-[var(--ease-out-strong)] hover:text-spanish-accent-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent-2";

  return (
    <div
      ref={conteneur}
      className="relative aspect-video w-full overflow-hidden bg-black"
    >
      {erreur && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-spanish-bg-dark px-6 text-center">
          <p className="font-semibold">
            La chaine n&apos;autorise pas la lecture en dehors de YouTube.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-spanish-accent-2 px-4 py-2 text-sm font-bold uppercase text-spanish-bg-dark transition-colors duration-200 hover:bg-spanish-accent-2-light"
          >
            Regarder sur YouTube
          </a>
        </div>
      )}

      {/* Calque qui capture le pointeur avant le cadre. Sans lui, le survol
          reveille l'interface de YouTube par-dessus la notre : titre de la
          video, suggestions, bouton central. Il sert aussi de commande, un clic
          sur l'image met en pause, comme partout ailleurs. */}
      <div
        onClick={basculerLecture}
        aria-hidden
        className="absolute inset-0 z-[5] cursor-pointer"
      />

      {pret && !erreur && !enLecture && (
        <button
          type="button"
          onClick={basculerLecture}
          aria-label="Reprendre la lecture"
          className="group absolute inset-0 z-[6] flex cursor-pointer items-center justify-center"
        >
          <span className="flex size-20 items-center justify-center rounded-full bg-spanish-accent-2 transition-colors duration-200 group-hover:bg-spanish-accent-2-light">
            <Play
              className="size-8 translate-x-0.5 fill-spanish-bg-dark text-spanish-bg-dark"
              aria-hidden
            />
          </span>
        </button>
      )}

      {pret && !erreur && muet && (
        <button
          type="button"
          onClick={basculerSon}
          className="absolute inset-x-0 top-4 z-20 mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-full bg-spanish-accent-2 px-4 py-2 text-sm font-bold uppercase text-spanish-bg-dark transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-accent-2-light active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <VolumeX className="size-4" aria-hidden />
          Activer le son
        </button>
      )}

      {!pret && !erreur && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-spanish-accent-2" />
        </div>
      )}

      {/* Barre de commandes. Le degrade garantit la lisibilite quelle que soit
          l'image, sans assombrir tout le cadre. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-24 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={basculerLecture}
          aria-label={enLecture ? "Mettre en pause" : "Reprendre la lecture"}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-spanish-accent-2 text-spanish-bg-dark transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-accent-2-light active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {enLecture ? (
            <Pause className="size-5 fill-spanish-bg-dark" aria-hidden />
          ) : (
            <Play
              className="size-5 translate-x-0.5 fill-spanish-bg-dark"
              aria-hidden
            />
          )}
        </button>

        <button
          type="button"
          onClick={basculerSon}
          aria-label={muet ? "Retablir le son" : "Couper le son"}
          className={habillageBouton}
        >
          {muet ? (
            <VolumeX className="size-5" aria-hidden />
          ) : (
            <Volume2 className="size-5" aria-hidden />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={muet ? 0 : volume}
          onChange={(e) => changerVolume(Number(e.target.value))}
          aria-label="Volume"
          className="hidden w-24 accent-spanish-accent-2 sm:block"
        />

        <span className="ms-auto flex items-center gap-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold uppercase italic text-white">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute size-2 rounded-full bg-white" />
            <span className="absolute size-2 animate-ping rounded-full bg-white" />
          </span>
          en direct
        </span>

        <button
          type="button"
          onClick={basculerPleinEcran}
          aria-label={pleinEcran ? "Quitter le plein ecran" : "Plein ecran"}
          className={habillageBouton}
        >
          {pleinEcran ? (
            <Minimize className="size-5" aria-hidden />
          ) : (
            <Maximize className="size-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
