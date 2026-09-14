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

/**
 * Avale les refus attendus du plein ecran.
 *
 * `requestFullscreen` rend une promesse, et le navigateur la refuse sans que ce
 * soit une panne : geste utilisateur trop ancien, permission absente dans un
 * cadre, ou appel deja en cours. Sans ce filet, chacun de ces cas laisse une
 * erreur rouge dans la console du visiteur.
 */
function sansBruit(resultat: unknown) {
  if (resultat instanceof Promise) resultat.catch(() => {});
}

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
 *
 * Rend faux quand aucun chemin n'existe, ce qui arrive sur iPhone devant un
 * cadre plutot qu'une video. L'appelant se rabat alors sur son propre plein
 * ecran : le bouton doit marcher partout, pas disparaitre.
 */
export function basculerPleinEcran(
  boite: HTMLElement | null,
  video?: HTMLVideoElement | null,
): boolean {
  const doc = document as DocumentEtendu;

  if (estEnPleinEcran()) {
    if (doc.exitFullscreen) sansBruit(doc.exitFullscreen());
    else doc.webkitExitFullscreen?.();
    return true;
  }

  const element = boite as ElementEtendu | null;

  if (element?.requestFullscreen) {
    sansBruit(element.requestFullscreen());
    return true;
  }

  if (element?.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
    return true;
  }

  const balise = video as VideoEtendue | null | undefined;

  if (balise?.webkitEnterFullscreen) {
    balise.webkitEnterFullscreen();
    return true;
  }

  // Aucun chemin disponible : c'est le cas d'un iPhone devant autre chose
  // qu'une balise video, un cadre YouTube par exemple. L'appelant doit le
  // savoir pour ne pas laisser un bouton qui ne fait rien.
  return false;
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
