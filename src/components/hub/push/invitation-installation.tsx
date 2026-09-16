"use client";

import { useEffect, useSyncExternalStore } from "react";

import EncartInstallation from "./encart-installation";
import { abonnerEtatPush, ecouterInstallation, etatPushServeur, lireEtatPush, rafraichirEtatPush } from "./etat-push";

const CLE = "hub.installation.plusTard";
const abonnes = new Set<() => void>();
let ferme: boolean | null = null;

const lireFerme = () => {
  if (ferme === null) {
    try {
      ferme = localStorage.getItem(CLE) === "1";
    } catch {
      ferme = false;
    }
  }
  return ferme;
};
const fermeServeur = () => true;
const abonnerFerme = (cb: () => void) => {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
};
const fermer = () => {
  ferme = true;
  try {
    localStorage.setItem(CLE, "1");
  } catch {
    // Stockage refuse : l'encart reviendra a la prochaine visite.
  }
  abonnes.forEach((cb) => cb());
};

/**
 * L'encart d'installation au premier passage sur l'accueil du Hub. « Plus
 * tard » le range dans ce navigateur ; il reste toujours dans le profil.
 */
export default function InvitationInstallation() {
  const etat = useSyncExternalStore(abonnerEtatPush, lireEtatPush, etatPushServeur);
  const range = useSyncExternalStore(abonnerFerme, lireFerme, fermeServeur);

  useEffect(() => {
    const arreter = ecouterInstallation();
    void rafraichirEtatPush();
    return arreter;
  }, []);

  const visible = etat.pret && !etat.installe && etat.mobile && (etat.ios || etat.installable);
  if (range || !visible) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <EncartInstallation etat={etat} onFermer={fermer} />
    </div>
  );
}
