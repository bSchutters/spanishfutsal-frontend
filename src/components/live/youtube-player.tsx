"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  basculerPleinEcran as basculer,
  suivrePleinEcran,
} from "@/lib/pleinEcran";
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
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (secondes: number, immediat: boolean) => void;
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

/**
 * Retard supplementaire a partir duquel on considere que le visiteur a decroche.
 *
 * Il se compte a partir du plus faible retard observe, jamais dans l'absolu :
 * YouTube place deja tout le monde une vingtaine de secondes derriere le bord
 * du direct, c'est sa latence normale. Mesure telle quelle, elle ferait dire au
 * lecteur que le visiteur a decroche alors qu'il vient d'arriver.
 */
const DECROCHAGE_TOLERE = 10;

// Le triangle de lucide est trace de 6 a 20 dans une grille de 24 : son centre
// tombe donc a 13 et non a 12. Le decalage optique est deja dans l'icone, en
// ajouter un le pousse trop loin, et d'autant plus visiblement que le bouton
// est petit.
const EN_LECTURE = 1;

// Hauteur rognee en haut et en bas, assez pour avaler les bandeaux de YouTube.
const MARGE = 90;

/** 4:07, ou 1:12:30 au-dela de l'heure. */
function formatDuree(secondes: number) {
  if (!Number.isFinite(secondes) || secondes < 0) return "0:00";

  const heures = Math.floor(secondes / 3600);
  const minutes = Math.floor((secondes % 3600) / 60);
  const reste = Math.floor(secondes % 60);
  const deux = (n: number) => String(n).padStart(2, "0");

  if (heures > 0) return `${heures}:${deux(minutes)}:${deux(reste)}`;

  return `${minutes}:${deux(reste)}`;
}

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
  mode,
}: {
  videoId: string;
  url: string;
  mode: "direct" | "replay";
}) {
  const enDirect = mode === "direct";
  const conteneur = useRef<HTMLDivElement>(null);
  const lecteur = useRef<Lecteur | null>(null);

  const [pret, setPret] = useState(false);
  const [enLecture, setEnLecture] = useState(true);
  const [muet, setMuet] = useState(true);
  const [volume, setVolume] = useState(100);
  const [erreur, setErreur] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [position, setPosition] = useState(0);
  const [duree, setDuree] = useState(0);
  const [decrochage, setDecrochage] = useState(0);
  const retardMinimal = useRef<number | null>(null);

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
    if (!pret) return;

    const suivre = () => {
      const lu = lecteur.current;
      if (!lu) return;

      const maintenant = lu.getCurrentTime();
      const totale = lu.getDuration();

      setPosition(maintenant);
      setDuree(totale);

      if (enDirect) {
        // Sur un direct, `getDuration` donne la longueur de la memoire tampon
        // et `getCurrentTime` la position dedans : leur ecart est le retard.
        const retard = Math.max(0, totale - maintenant);

        retardMinimal.current =
          retardMinimal.current === null
            ? retard
            : Math.min(retardMinimal.current, retard);

        setDecrochage(retard - retardMinimal.current);
      }
    };

    suivre();
    const minuteur = setInterval(suivre, 500);

    return () => clearInterval(minuteur);
  }, [enDirect, pret]);

  useEffect(() => suivrePleinEcran(setPleinEcran), []);

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

  const revenirAuDirect = useCallback(() => {
    const lu = lecteur.current;
    if (!lu) return;

    lu.seekTo(lu.getDuration(), true);
    lu.playVideo();

    // Le saut ramene au bord : ce nouveau retard devient la reference.
    retardMinimal.current = null;
    setDecrochage(0);
  }, []);

  const deplacer = useCallback((secondes: number) => {
    setPosition(secondes);
    lecteur.current?.seekTo(secondes, true);
  }, []);

  const basculerPleinEcran = useCallback(() => {
    basculer(conteneur.current);
  }, []);

  const habillageBouton =
    "flex size-8 cursor-pointer items-center justify-center rounded-md text-white sm:size-9 transition-[scale,color] duration-200 ease-[var(--ease-out-strong)] hover:text-spanish-accent-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent-2";

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
            className="rounded-md border-2 border-spanish-accent-2-dark bg-spanish-accent-2 px-4 py-2 text-sm font-bold uppercase text-spanish-bg-dark transition-colors duration-200 hover:bg-spanish-accent-2-dark"
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
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-spanish-accent-2-dark bg-spanish-accent-2 sm:size-16 transition-colors duration-200 group-hover:bg-spanish-accent-2-dark">
            <Play
              className="size-5 fill-spanish-bg-dark text-spanish-bg-dark sm:size-7"
              aria-hidden
            />
          </span>
        </button>
      )}

      {pret && !erreur && muet && (
        <button
          type="button"
          onClick={basculerSon}
          className="absolute inset-x-0 top-2 z-20 mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-full border-2 border-spanish-accent-2-dark bg-spanish-accent-2 px-3 py-1 text-xs font-bold uppercase text-spanish-bg-dark sm:top-4 sm:px-4 sm:py-2 sm:text-sm transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-accent-2-dark active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <VolumeX className="size-3.5 sm:size-4" aria-hidden />
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
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 bg-gradient-to-t from-black via-black/80 to-transparent px-2 pb-2 pt-12 sm:gap-3 sm:px-4 sm:pb-3 sm:pt-24">
        <button
          type="button"
          onClick={basculerLecture}
          aria-label={enLecture ? "Mettre en pause" : "Reprendre la lecture"}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-spanish-accent-2-dark bg-spanish-accent-2 text-spanish-bg-dark sm:size-11 transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-accent-2-dark active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {enLecture ? (
            <Pause
              className="size-4 fill-spanish-bg-dark sm:size-5"
              aria-hidden
            />
          ) : (
            <Play
              className="size-4 fill-spanish-bg-dark sm:size-5"
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
            <VolumeX className="size-4 sm:size-5" aria-hidden />
          ) : (
            <Volume2 className="size-4 sm:size-5" aria-hidden />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={muet ? 0 : volume}
          onChange={(e) => changerVolume(Number(e.target.value))}
          aria-label="Volume"
          className="hidden w-24 cursor-pointer accent-spanish-accent-2 sm:block"
        />

        {/* La barre existe dans les deux modes, mais seulement quand il y a
            une plage a parcourir. Sur un direct, `getDuration` reste a zero
            tant que la lecture n'a pas commence, et pour toujours si le
            diffuseur a coupe la memoire tampon : une barre vide au depart ne
            dirait rien de vrai. */}
        {duree > 0 && (
          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min={0}
              max={duree || 0}
              step={1}
              value={position}
              onChange={(e) => deplacer(Number(e.target.value))}
              aria-label={
                enDirect ? "Position dans le direct" : "Position dans la video"
              }
              className="w-full cursor-pointer accent-spanish-accent-2"
            />

            {enDirect ? (
              decrochage > DECROCHAGE_TOLERE && (
                <span className="shrink-0 text-xs tabular-nums text-white">
                  -{formatDuree(decrochage)}
                </span>
              )
            ) : (
              <span className="shrink-0 text-xs tabular-nums text-white">
                {formatDuree(position)} / {formatDuree(duree)}
              </span>
            )}
          </div>
        )}

        {enDirect &&
          (decrochage > DECROCHAGE_TOLERE ? (
            // Decroche du direct, par une pause ou un deplacement : la pastille
            // devient le chemin du retour, comme chez YouTube.
            <button
              type="button"
              onClick={revenirAuDirect}
              className="ms-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-md border-2 border-spanish-bg-lighter bg-spanish-bg-lighter/40 px-2.5 py-1 text-xs font-bold uppercase italic text-white transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-spanish-bg-lighter active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent-2"
            >
              <span className="size-2 rounded-full bg-white/50" />
              revenir au direct
            </button>
          ) : (
            <span className="ms-auto flex shrink-0 items-center gap-2 rounded-md bg-red-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase italic text-white sm:px-2.5 sm:py-1 sm:text-xs">
              <span className="relative flex size-2 items-center justify-center">
                <span className="absolute size-2 rounded-full bg-white" />
                <span className="absolute size-2 animate-ping rounded-full bg-white" />
              </span>
              en direct
            </span>
          ))}

        <button
          type="button"
          onClick={basculerPleinEcran}
          aria-label={pleinEcran ? "Quitter le plein ecran" : "Plein ecran"}
          className={habillageBouton}
        >
          {pleinEcran ? (
            <Minimize className="size-4 sm:size-5" aria-hidden />
          ) : (
            <Maximize className="size-4 sm:size-5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
