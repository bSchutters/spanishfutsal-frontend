import { enLocal, FUSEAU } from "@/hub/dates";

/**
 * Les anniversaires de la semaine, pour l'accueil du Hub : aujourd'hui et
 * les six jours suivants, vus depuis Bruxelles. Une semaine glissante plutot
 * que la semaine du calendrier : un dimanche, elle montre encore ce qui
 * arrive, et c'est a l'avance qu'un post d'anniversaire se prepare.
 *
 * Sans base ni Payload : la regle se verifie a sec.
 */

export const JOURS_DE_LA_SEMAINE = 7;

export type Personne = {
  id: number;
  prenom: string;
  nom: string;
  /** « 2001-06-30 », ou null. */
  dateNaissance: string | null;
  actif: boolean;
};

export type Anniversaire = {
  id: number;
  prenom: string;
  nom: string;
  /** Le jour de la fete, « 2026-10-05 ». */
  jour: string;
  /** L'age atteint ce jour-la. */
  age: number;
  /** 0 aujourd'hui, 1 demain, et ainsi de suite. */
  dansJours: number;
};

const deux = (n: number) => String(n).padStart(2, "0");

/**
 * Les fiches actives dont l'anniversaire tombe dans la semaine, de la plus
 * proche a la plus lointaine. Une naissance un 29 fevrier se fete le 28 les
 * annees qui n'en ont pas.
 */
export function anniversairesDeLaSemaine(personnes: readonly Personne[], maintenant: Date, fuseau = FUSEAU): Anniversaire[] {
  const local = enLocal(maintenant, fuseau);
  const aujourdHui = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());

  const jours = Array.from({ length: JOURS_DE_LA_SEMAINE }, (_, dansJours) => {
    const date = new Date(aujourdHui + dansJours * 24 * 60 * 60 * 1000);
    const annee = date.getUTCFullYear();
    const mois = date.getUTCMonth() + 1;
    const jour = date.getUTCDate();
    const bissextile = new Date(Date.UTC(annee, 1, 29)).getUTCMonth() === 1;
    return { dansJours, annee, mois, jour, bissextile };
  });

  const resultat: Anniversaire[] = [];
  for (const p of personnes) {
    if (!p.actif || !p.dateNaissance) continue;
    const [anneeNaissance, mois, jour] = p.dateNaissance.split("-").map(Number);
    if (!anneeNaissance || !mois || !jour) continue;
    const fete = jours.find((j) =>
      mois === 2 && jour === 29 && !j.bissextile ? j.mois === 2 && j.jour === 28 : j.mois === mois && j.jour === jour,
    );
    if (!fete || fete.annee <= anneeNaissance) continue;
    resultat.push({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      jour: `${fete.annee}-${deux(fete.mois)}-${deux(fete.jour)}`,
      age: fete.annee - anneeNaissance,
      dansJours: fete.dansJours,
    });
  }
  return resultat.sort((a, b) => a.dansJours - b.dansJours || a.prenom.localeCompare(b.prenom, "fr"));
}
