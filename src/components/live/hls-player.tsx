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
 * Le lecteur des diffusions XbotGo.
 *
 * TEMPORAIRE : en place le temps que le direct YouTube de la chaine du club
 * soit actif. Contrairement a YouTube, leur diffuseur sert un flux HLS avec
 * CORS ouvert : on le joue donc dans une vraie balise video, sans cadre et sans
 * interface etrangere. Le filigrane du club reste visible, il est incruste dans
 * le flux lui-meme.
 *
 * La barre de commandes est celle du lecteur YouTube, aux memes couleurs, pour
 * que le visiteur ne voie aucune difference selon la source.
 */

// Verse dans public/ plutot qu'installe : le magasin pnpm de la machine ne
// correspond plus a celui du projet, et cette integration est temporaire. Le
// fichier part avec elle.
const HLS = "/hls.light.min.js";

type IncidentHls = { fatal?: boolean; details?: string };

type LecteurHls = {
  loadSource: (url: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  destroy: () => void;
  on: (evenement: string, rappel: (e: unknown, d: IncidentHls) => void) => void;
};

type FabriqueHls = {
  new (options?: Record<string, unknown>): LecteurHls;
  isSupported: () => boolean;
  Events: { ERROR: string };
};

declare global {
  interface Window {
    Hls?: FabriqueHls;
  }
}

let scriptCharge: Promise<FabriqueHls | null> | null = null;

/** Le lecteur n'est telecharge qu'une fois, et seulement s'il sert. */
function chargerHls(): Promise<FabriqueHls | null> {
  if (scriptCharge) return scriptCharge;

  scriptCharge = new Promise((resoudre) => {
    if (window.Hls) {
      resoudre(window.Hls);
      return;
    }

    const balise = document.createElement("script");
    balise.src = HLS;
    balise.onload = () => resoudre(window.Hls ?? null);
    balise.onerror = () => resoudre(null);
    document.head.appendChild(balise);
  });

  return scriptCharge;
}

export default function HlsPlayer({ url }: { url: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const [pret, setPret] = useState(false);
  const [enLecture, setEnLecture] = useState(true);
  const [muet, setMuet] = useState(true);
  const [volume, setVolume] = useState(100);
  const [erreur, setErreur] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  // Incremente pour remonter le lecteur apres un echec.
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const element = video.current;
    if (!element) return;

    let annule = false;
    let lecteur: LecteurHls | null = null;

    const demarrer = async () => {
      const Hls = await chargerHls();
      if (annule) return;

      // hls.js d'abord partout ou il fonctionne. Chromium repond « maybe » a
      // `canPlayType` pour le HLS sans savoir le lire : s'y fier envoyait
      // l'adresse directement a la balise video, ou elle echouait.
      if (Hls?.isSupported()) {
        lecteur = new Hls({ lowLatencyMode: true });
        // hls.js signale beaucoup d'incidents sans gravite, un segment en
        // retard par exemple, et se retablit seul. Seuls les incidents fatals
        // meritent de couvrir l'image, sinon on masque un direct qui tourne.
        lecteur.on(Hls.Events.ERROR, (_evenement, incident) => {
          if (!annule && incident?.fatal) setErreur(true);
        });
        lecteur.loadSource(url);
        lecteur.attachMedia(element);
        return;
      }

      // Safari et iOS, qui lisent le HLS nativement et ou hls.js ne sert pas.
      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        element.src = url;
        return;
      }

      setErreur(true);
    };

    demarrer();

    return () => {
      annule = true;
      lecteur?.destroy();
    };
  }, [url, essai]);

  useEffect(() => suivrePleinEcran(setPleinEcran), []);

  /**
   * Le bord du direct, tel que le flux le declare a l'instant.
   *
   * Leur diffuseur ne garde que douze secondes en memoire, sur une fenetre qui
   * glisse : une pause un peu longue laisse le lecteur en dehors, et il calerait
   * sans ce rattrapage.
   */
  const auBordDuDirect = useCallback((element: HTMLVideoElement) => {
    if (!element.seekable.length) return;

    const bord = element.seekable.end(element.seekable.length - 1);
    const debut = element.seekable.start(0);

    if (element.currentTime < debut || element.currentTime > bord) {
      element.currentTime = bord;
    }
  }, []);

  const basculerLecture = useCallback(() => {
    const element = video.current;
    if (!element) return;

    if (element.paused) {
      auBordDuDirect(element);
      element.play();
    } else {
      element.pause();
    }
  }, [auBordDuDirect]);

  const basculerSon = useCallback(() => {
    const element = video.current;
    if (!element) return;

    element.muted = !element.muted;
    setMuet(element.muted);
  }, []);

  const changerVolume = useCallback((valeur: number) => {
    const element = video.current;
    if (!element) return;

    element.volume = valeur / 100;
    setVolume(valeur);

    // Bouger le curseur remet le son : c'est le geste de quelqu'un qui veut
    // entendre.
    if (valeur > 0 && element.muted) {
      element.muted = false;
      setMuet(false);
    }
  }, []);

  /** Retour au bord du direct, la ou le flux en est vraiment. */
  const revenirAuDirect = useCallback(() => {
    const element = video.current;
    if (!element || !element.seekable.length) return;

    element.currentTime = element.seekable.end(element.seekable.length - 1);
    element.play();
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;

    // Le lecteur attend des donnees qui ne viendront pas : il est sorti de la
    // fenetre. On le ramene au bord plutot que de le laisser caler.
    const rattraper = () => auBordDuDirect(element);
    element.addEventListener("waiting", rattraper);

    return () => element.removeEventListener("waiting", rattraper);
  }, [auBordDuDirect]);

  const basculerPleinEcran = useCallback(() => {
    basculer(conteneur.current, video.current);
  }, []);

  const habillageBouton =
    "flex size-8 cursor-pointer items-center justify-center rounded-md text-white sm:size-9 transition-[scale,color] duration-200 ease-[var(--ease-out-strong)] hover:text-spanish-accent-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spanish-accent-2";

  return (
    <div ref={conteneur} className="relative aspect-video w-full bg-black">
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        onPlay={() => setEnLecture(true)}
        onPause={() => setEnLecture(false)}
        onLoadedData={() => setPret(true)}
        onError={() => setErreur(true)}
        className="absolute inset-0 h-full w-full"
      />

      {erreur && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-spanish-bg-dark px-6 text-center">
          <p className="font-semibold">La diffusion s&apos;est interrompue.</p>
          {/* Reessayer plutot qu'un lien sortant : leur page reclame un mot de
              passe, y envoyer un visiteur ne l'avancerait pas. */}
          <button
            type="button"
            onClick={() => {
              setErreur(false);
              setEssai((n) => n + 1);
            }}
            className="rounded-md border-2 border-spanish-accent-2-dark bg-spanish-accent-2 px-4 py-2 text-sm font-bold uppercase text-spanish-bg-dark transition-colors duration-200 hover:bg-spanish-accent-2-dark"
          >
            Réessayer
          </button>
        </div>
      )}

      {!pret && !erreur && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-spanish-accent-2" />
        </div>
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

        <button
          type="button"
          onClick={revenirAuDirect}
          className="ms-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-md bg-red-600 px-2 py-0.5 text-[0.65rem] font-bold uppercase italic text-white sm:px-2.5 sm:py-1 sm:text-xs transition-[scale,background-color] duration-200 ease-[var(--ease-out-strong)] hover:bg-red-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute size-2 rounded-full bg-white" />
            <span className="absolute size-2 animate-ping rounded-full bg-white" />
          </span>
          en direct
        </button>

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
