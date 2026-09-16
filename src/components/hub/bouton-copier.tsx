"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copie une valeur dans le presse-papiers et le dit pendant deux secondes. */
export default function BoutonCopier({ valeur, libelle = "Copier le lien" }: { valeur: string; libelle?: string }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt("Copiez ce lien :", valeur);
    }
  };

  return (
    <Button type="button" variant="hubSecondary" className="h-11 w-full" onClick={copier}>
      {copie ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copie ? "Lien copié" : libelle}
    </Button>
  );
}
