/**
 * Les entrees du menu que la personne a repliees, memorisees dans son
 * navigateur. Un petit magasin pour `useSyncExternalStore` : le serveur voit
 * tout deplie, le navigateur ce qu'il a memorise, sans passer par un effet.
 */
const CLE = "hub.menu.replies";

let repliesCourants: ReadonlySet<string> | null = null;
const abonnes = new Set<() => void>();
const AUCUN: ReadonlySet<string> = new Set();

function lire(): ReadonlySet<string> {
  try {
    const brut = localStorage.getItem(CLE);
    const lu: unknown = brut ? JSON.parse(brut) : [];
    return new Set(Array.isArray(lu) ? lu.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return AUCUN;
  }
}

export function lireReplisMemorises(): ReadonlySet<string> {
  if (repliesCourants === null) repliesCourants = lire();
  return repliesCourants;
}

export function replisServeur(): ReadonlySet<string> {
  return AUCUN;
}

export function abonnerReplis(callback: () => void): () => void {
  abonnes.add(callback);
  return () => {
    abonnes.delete(callback);
  };
}

export function basculerRepli(route: string): void {
  const suivant = new Set(lireReplisMemorises());
  if (suivant.has(route)) suivant.delete(route);
  else suivant.add(route);
  repliesCourants = suivant;
  try {
    localStorage.setItem(CLE, JSON.stringify([...suivant]));
  } catch {
    // Stockage refuse : le repli vaut pour la visite en cours.
  }
  abonnes.forEach((callback) => callback());
}
