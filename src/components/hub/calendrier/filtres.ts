import type { EvenementCalendrier } from "@/hub/calendrier/donnees";

/**
 * Les filtres du calendrier, memorises par personne dans le navigateur. Ils
 * ne touchent pas aux droits : ce qui n'est pas dans les flux de la personne
 * n'arrive jamais jusqu'ici.
 */
export type Filtres = {
  typeIds: number[];
  fluxIds: number[];
  responsableId: number | null;
  lesMiens: boolean;
};

export const FILTRES_VIDES: Filtres = { typeIds: [], fluxIds: [], responsableId: null, lesMiens: false };

const CLE = "hub.calendrier.filtres";

export function lireFiltres(): Filtres {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return FILTRES_VIDES;
    const lu = JSON.parse(brut) as Partial<Filtres>;
    return {
      typeIds: Array.isArray(lu.typeIds) ? lu.typeIds.filter((n) => typeof n === "number") : [],
      fluxIds: Array.isArray(lu.fluxIds) ? lu.fluxIds.filter((n) => typeof n === "number") : [],
      responsableId: typeof lu.responsableId === "number" ? lu.responsableId : null,
      lesMiens: lu.lesMiens === true,
    };
  } catch {
    return FILTRES_VIDES;
  }
}

/**
 * Un petit magasin pour `useSyncExternalStore` : le serveur voit des filtres
 * vides, le navigateur ceux qu'il a memorises, sans passer par un effet.
 */
let filtresCourants: Filtres | null = null;
const abonnes = new Set<() => void>();

export function lireFiltresMemorises(): Filtres {
  if (filtresCourants === null) filtresCourants = lireFiltres();
  return filtresCourants;
}

export function filtresServeur(): Filtres {
  return FILTRES_VIDES;
}

export function abonnerFiltres(callback: () => void): () => void {
  abonnes.add(callback);
  return () => {
    abonnes.delete(callback);
  };
}

export function ecrireFiltres(filtres: Filtres): void {
  filtresCourants = filtres;
  try {
    localStorage.setItem(CLE, JSON.stringify(filtres));
  } catch {
    // Stockage refuse : les filtres valent pour la visite en cours.
  }
  abonnes.forEach((callback) => callback());
}

export function filtresActifs(filtres: Filtres): number {
  return (
    (filtres.typeIds.length > 0 ? 1 : 0) +
    (filtres.fluxIds.length > 0 ? 1 : 0) +
    (filtres.responsableId !== null ? 1 : 0) +
    (filtres.lesMiens ? 1 : 0)
  );
}

export function passeLesFiltres(evenement: EvenementCalendrier, filtres: Filtres, utilisateurId: number): boolean {
  if (filtres.typeIds.length > 0 && !filtres.typeIds.includes(evenement.typeId)) return false;
  if (filtres.fluxIds.length > 0 && !evenement.fluxIds.some((id) => filtres.fluxIds.includes(id))) return false;
  if (filtres.responsableId !== null && !evenement.responsablesIds.includes(filtres.responsableId)) return false;
  if (filtres.lesMiens && !evenement.responsablesIds.includes(utilisateurId)) return false;
  return true;
}
