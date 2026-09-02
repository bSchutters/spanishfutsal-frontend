/**
 * Le plein ecran, sur les trois chemins que les navigateurs proposent.
 *
 * Safari n'a pas suivi la meme route que les autres. Sur macOS, les versions
 * anciennes ne connaissent que la variante prefixee `webkit`. Sur iPhone, c'est
 * plus radical : un element quelconque ne peut pas passer en plein ecran, seule
 * une balise video le peut, et par une methode qui lui est propre. L'appel
 * standard y est simplement absent, sans erreur, ce qui donne un bouton qui ne
 * fait rien.
 */

type ElementEtendu = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

type VideoEtendue = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

type DocumentEtendu = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

/** Y a-t-il quelque chose en plein ecran, quelle que soit la variante ? */
export function estEnPleinEcran(): boolean {
  const doc = document as DocumentEtendu;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

/**
 * Met la boite en plein ecran, ou la video a defaut.
 *
 * L'ordre compte : on prefere la boite, qui emporte nos commandes avec elle.
 * La video seule est le dernier recours, sur iPhone, ou le lecteur natif
 * d'Apple prend alors la main.
 */
export function basculerPleinEcran(
  boite: HTMLElement | null,
  video?: HTMLVideoElement | null,
) {
  const doc = document as DocumentEtendu;

  if (estEnPleinEcran()) {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else doc.webkitExitFullscreen?.();
    return;
  }

  const element = boite as ElementEtendu | null;

  if (element?.requestFullscreen) {
    element.requestFullscreen();
    return;
  }

  if (element?.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
    return;
  }

  (video as VideoEtendue | null | undefined)?.webkitEnterFullscreen?.();
}

/**
 * S'abonne aux changements d'etat, variante prefixee comprise.
 * Rend la fonction de desabonnement.
 */
export function suivrePleinEcran(rappel: (actif: boolean) => void) {
  const signaler = () => rappel(estEnPleinEcran());

  document.addEventListener("fullscreenchange", signaler);
  document.addEventListener("webkitfullscreenchange", signaler);

  return () => {
    document.removeEventListener("fullscreenchange", signaler);
    document.removeEventListener("webkitfullscreenchange", signaler);
  };
}
