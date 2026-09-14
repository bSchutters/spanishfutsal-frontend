/**
 * D'ou le visiteur arrive, par grandes familles.
 *
 * Releve a la premiere page vue et garde le temps de l'onglet, parce que c'est
 * la seule occasion : une fois la navigation commencee, le referent devient le
 * site lui-meme et l'information est perdue.
 *
 * Seule la famille est conservee, jamais l'adresse complete de la page d'origine
 * qui peut designer un groupe prive ou une conversation. Rien la-dedans ne
 * permet de reconnaitre quelqu'un.
 */

export type Provenance =
  | "direct"
  | "facebook"
  | "instagram"
  | "recherche"
  | "autre"
  | "interne";

const CLE = "uda-provenance";

const FAMILLES: [RegExp, Provenance][] = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [
    /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.[a-z.]+|ecosia\.org|qwant\.com|search\.brave\.com)$/,
    "recherche",
  ],
];

function lire(): Provenance {
  try {
    const referent = document.referrer;
    if (!referent) return "direct";

    const hote = new URL(referent).hostname.toLowerCase();
    if (hote === location.hostname) return "interne";

    for (const [motif, famille] of FAMILLES) {
      if (motif.test(hote)) return famille;
    }

    return "autre";
  } catch {
    return "direct";
  }
}

/** A appeler une fois par page, le plus tot possible. */
export function noterLaProvenance(): void {
  try {
    if (sessionStorage.getItem(CLE)) return;

    const trouvee = lire();

    // Une navigation interne n'apprend rien : on attend la vraie premiere page.
    if (trouvee === "interne") return;

    sessionStorage.setItem(CLE, trouvee);
  } catch {
    // Stockage refuse : la provenance vaudra « direct », ce qui est le defaut
    // le plus honnete faute de mieux.
  }
}

export function provenance(): Provenance {
  try {
    return (sessionStorage.getItem(CLE) as Provenance) ?? "direct";
  } catch {
    return "direct";
  }
}
