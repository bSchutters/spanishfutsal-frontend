"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copie une valeur dans le presse-papiers et le dit pendant deux secondes. */
export default function BoutonCopier({
  valeur,
  libelle = "Copier le lien",
  libelleCopie = "Lien copié",
  className = "h-11 w-full",
}: {
  valeur: string;
  libelle?: string;
  libelleCopie?: string;
  className?: string;
}) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt("Copiez cette valeur :", valeur);
    }
  };

  return (
    <Button type="button" variant="hubSecondary" className={className} onClick={copier}>
      {copie ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copie ? libelleCopie : libelle}
    </Button>
  );
}
