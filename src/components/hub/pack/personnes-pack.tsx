"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ajouterPersonnePack, remettrePersonnePack, retirerPersonnePack } from "@/hub/actions/pack";
import type { Resultat } from "@/hub/actions/evenements";
import { NOM_PERSONNE_MAX, type PersonnePack, type PersonnesPack } from "@/hub/pack/schema";

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * La liste « Qui commande ? » de la page des joueurs, reglee ici (Bryan,
 * 08/10/2026) : l'effectif actif du site, d'ou l'on retire ceux qui ne
 * commandent pas, et des noms ajoutes, un proche, un entraineur, un sponsor.
 * L'effectif du site ne change pas : il se gere dans Effectif.
 */
export default function PersonnesPackForm({ personnes: initiales }: { personnes: PersonnesPack }) {
  const [personnes, setPersonnes] = useState(initiales);
  const [nom, setNom] = useState("");
  // La personne en cours d'ecriture, ou « ajout » pendant qu'un nom part.
  const [enCours, setEnCours] = useState<string | null>(null);

  const appliquer = async (cle: string, action: () => Promise<Resultat<PersonnesPack>>, reussite: string) => {
    setEnCours(cle);
    const r = await action().catch(() => ({ ok: false as const, erreur: "La liste n'a pas pu être enregistrée." }));
    setEnCours(null);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    setPersonnes(r.donnees);
    toast.success(reussite);
    return true;
  };

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    const saisi = nom.trim();
    if (!saisi) return;
    if (await appliquer("ajout", () => ajouterPersonnePack(saisi), `${saisi} peut commander.`)) setNom("");
  };

  const retirer = (p: PersonnePack) =>
    void appliquer(p.cle, () => retirerPersonnePack(p.cle), p.origine === "ajout" ? `${p.nom} est retiré de la liste.` : `${p.nom} ne figure plus dans la liste.`);

  const remettre = (p: PersonnePack) => void appliquer(p.cle, () => remettrePersonnePack(p.cle), `${p.nom} est de retour dans la liste.`);

  const ajouts = personnes.liste.filter((p) => p.origine === "ajout").length;

  return (
    <Panneau
      titre="Qui peut commander"
      description={`La liste « Qui commande ? » de la page des joueurs : ${pluriel(personnes.liste.length, "nom")}, dont ${pluriel(ajouts, "ajout")}. L'effectif du site ne change pas.`}
    >
      <form onSubmit={(e) => void ajouter(e)} className="flex gap-2 border-b border-border px-4 py-3">
        <Input
          aria-label="Nom à ajouter"
          placeholder="Prénom Nom, un proche, un entraîneur…"
          value={nom}
          maxLength={NOM_PERSONNE_MAX}
          onChange={(e) => setNom(e.target.value)}
          className="h-9"
        />
        <Button type="submit" variant="hub" size="sm" className="h-9 shrink-0" disabled={enCours !== null || nom.trim().length < 2}>
          <Plus aria-hidden="true" />
          Ajouter
        </Button>
      </form>

      {personnes.liste.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Personne ne peut commander pour l&apos;instant.</p>
      ) : (
        <ul className="grid max-h-96 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" aria-label="Personnes qui peuvent commander">
          {personnes.liste.map((p) => (
            <li key={p.cle} className="flex min-w-0 items-center gap-2 border-b border-border py-1.5 ps-4 pe-2">
              <span className="min-w-0 flex-1 truncate text-sm">{p.nom}</span>
              {p.origine === "ajout" ? <Etiquette>Ajouté</Etiquette> : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Retirer ${p.nom} de la liste`}
                title={p.origine === "ajout" ? "Retirer ce nom" : "Retirer de la liste, sans toucher à l'effectif"}
                disabled={enCours !== null}
                onClick={() => retirer(p)}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {personnes.retires.length > 0 ? (
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Retirés de la liste ({personnes.retires.length})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {personnes.retires.map((p) => (
              <li key={p.cle}>
                <Button
                  type="button"
                  variant="hubSecondary"
                  size="sm"
                  disabled={enCours !== null}
                  onClick={() => remettre(p)}
                  aria-label={`Remettre ${p.nom} dans la liste`}
                  title="Remettre dans la liste"
                >
                  <RotateCcw aria-hidden="true" />
                  {p.nom}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panneau>
  );
}
