"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ajouterPersonnePack, remettrePersonnePack, retirerPersonnePack } from "@/hub/actions/pack";
import type { Resultat } from "@/hub/actions/evenements";
import { NOM_PERSONNE_MAX, type PersonnePack, type PersonnesPack } from "@/hub/pack/schema";

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * La liste « Qui commande ? » de la page des joueurs, reglee ici (Bryan,
 * 08/10/2026). Elle part de l'effectif actif du site, qui n'est pas affiche :
 * on n'y voit que les noms ajoutes, un proche, un entraineur, un sponsor. Un
 * joueur qui ne commande pas se retire par un menu, et se remet d'un clic.
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

  const ajouts = personnes.liste.filter((p) => p.origine === "ajout");
  const effectif = personnes.liste.filter((p) => p.origine === "effectif");

  return (
    <Panneau
      titre="Qui peut commander"
      description={`Les noms hors effectif qui peuvent aussi commander, en tête de la liste « Qui commande ? ». Les ${pluriel(effectif.length, "joueur")} de l'effectif actif y sont déjà.`}
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

      {ajouts.length === 0 ? (
        <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">Aucun nom ajouté : seuls les joueurs de l&apos;effectif peuvent commander.</p>
      ) : (
        <ul className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-3" aria-label="Noms ajoutés">
          {ajouts.map((p) => (
            <li key={p.cle} className="flex min-w-0 items-center gap-2 py-1.5 ps-4 pe-2">
              <span className="min-w-0 flex-1 truncate text-sm">{p.nom}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Retirer ${p.nom} de la liste`}
                title="Retirer ce nom"
                disabled={enCours !== null}
                onClick={() => retirer(p)}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        {/* Un joueur de l'effectif qui ne commande pas : on le choisit ici, sans faire defiler tout l'effectif. */}
        <Select
          value=""
          onValueChange={(cle) => {
            const p = effectif.find((x) => x.cle === cle);
            if (p) retirer(p);
          }}
          disabled={enCours !== null || effectif.length === 0}
        >
          <SelectTrigger aria-label="Retirer un joueur de l'effectif de la liste" className="h-9 w-full sm:w-80">
            <SelectValue placeholder="Retirer un joueur de l'effectif de la liste…" />
          </SelectTrigger>
          <SelectContent>
            {effectif.map((p) => (
              <SelectItem key={p.cle} value={p.cle}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {personnes.retires.length > 0 ? (
          <div>
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
      </div>
    </Panneau>
  );
}
