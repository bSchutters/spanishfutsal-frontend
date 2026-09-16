"use client";

import { useSyncExternalStore } from "react";

/**
 * En developpement seulement : les erreurs JavaScript de la page s'affichent
 * en bas de l'ecran. Sur un telephone, il n'y a pas de console a ouvrir, et
 * un ecran qui reste vide ne dit pas pourquoi.
 */

let erreurs: string[] = [];
const abonnes = new Set<() => void>();
let installe = false;

function signaler(message: string) {
  erreurs = [...erreurs.slice(-4), message];
  abonnes.forEach((cb) => cb());
}

function installer() {
  if (installe || typeof window === "undefined") return;
  installe = true;
  window.addEventListener(
    "error",
    (e) => {
      // Un fichier qui ne se charge pas (script, feuille de style) arrive
      // ici aussi, sans message : on nomme la ressource.
      const cible = e.target as { src?: string; href?: string; tagName?: string } | null;
      if (!e.message && cible && cible !== (window as unknown)) {
        signaler(`Chargement échoué : ${cible.tagName?.toLowerCase() ?? "?"} ${(cible.src ?? cible.href ?? "").split("/").pop()}`);
        return;
      }
      signaler(`${e.message} (${e.filename?.split("/").pop() ?? "?"}:${e.lineno})`);
    },
    true,
  );
  window.addEventListener("unhandledrejection", (e) =>
    signaler(`Promesse rejetée : ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`),
  );
}

function abonner(cb: () => void) {
  installer();
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}

const AUCUNE: string[] = [];
const lire = () => erreurs;
// Toujours la meme reference : React compare les instantanes par identite.
const lireServeur = () => AUCUNE;

export default function RapporteurErreurs() {
  const liste = useSyncExternalStore(abonner, lire, lireServeur);
  if (liste.length === 0) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-2 bottom-20 z-50 max-h-48 overflow-y-auto rounded-md border border-destructive bg-background p-3 text-xs md:bottom-4 md:left-64 md:max-w-xl"
    >
      <p className="mb-1 font-semibold text-destructive">Erreur JavaScript (affichée en développement)</p>
      <ul className="flex flex-col gap-1 break-words">
        {liste.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
