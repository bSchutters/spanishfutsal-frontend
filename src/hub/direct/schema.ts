/**
 * Ce qu'une diffusion raconte, et les deux calculs qui s'en deduisent.
 *
 * Sans base ni configuration : ces fonctions se verifient a sec, et les
 * importer depuis un test ne reveille pas Payload. C'est aussi la raison
 * pratique : le module de lecture, lui, tire toute la configuration du site.
 */

/** Ce qu'une diffusion raconte, tel que le rapport l'a fige. */
export type Diffusion = {
  id: number;
  matchId: number | null;
  affiche: string;
  /** Premiere arrivee et dernier depart, en ISO. */
  debut: string | null;
  fin: string | null;
  /** Personnes differentes, et non presences. */
  uniques: number;
  /** Le plus grand nombre de personnes presentes en meme temps. */
  pointe: number;
  dureeMoyenne: number;
  partMobile: number;
  /** Presents minute par minute. */
  courbe: number[];
  detail: DetailDiffusion;
};

/** Le reste des mesures, tel qu'il est range dans le champ `details`. */
export type DetailDiffusion = {
  minutePointe?: number;
  dureeMedianeMinutes?: number;
  heuresVisionnees?: number;
  partSon?: number;
  partPleinEcran?: number;
  retention?: {
    cinq?: number;
    quinze?: number;
    trente?: number;
    quarantecinq?: number;
    jusquauBout?: number;
  };
  provenances?: Record<string, number>;
  ecrans?: Record<string, number>;
  coupuresMoyennes?: number;
  partSansCoupure?: number;
  avecIdentite?: number;
  habitues?: number | null;
  arrivees?: number[];
};

/**
 * La diffusion precedente, pour la comparaison.
 *
 * C'est elle qui donne son sens a un chiffre : vingt-cinq spectateurs ne veut
 * rien dire tant qu'on ignore si le match d'avant en avait dix ou quarante.
 */
export function precedente(
  diffusions: Diffusion[],
  courante: Diffusion,
): Diffusion | null {
  const rang = diffusions.findIndex((d) => d.id === courante.id);
  return rang >= 0 ? (diffusions[rang + 1] ?? null) : null;
}

/** L'ecart en pourcentage entre deux nombres, ou null si le premier est nul. */
export function evolution(avant: number, apres: number): number | null {
  if (!avant) return null;
  return Math.round(((apres - avant) / avant) * 100);
}
