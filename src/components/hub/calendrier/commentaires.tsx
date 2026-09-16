"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ajouterCommentaire, supprimerCommentaire } from "@/hub/actions/evenements";
import type { Commentaire } from "@/hub/calendrier/donnees";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";

/** Les commentaires d'un evenement ou d'une idee, et le champ pour en ajouter un. */
export default function Commentaires({
  relationTo,
  cibleId,
  commentaires,
  utilisateurId,
  estAdmin,
  onChange,
}: {
  relationTo: "events" | "ideas";
  cibleId: number;
  commentaires: Commentaire[];
  utilisateurId: number;
  estAdmin: boolean;
  onChange: () => void;
}) {
  const [contenu, setContenu] = useState("");
  const [enCours, lancer] = useTransition();

  const envoyer = () => {
    if (!contenu.trim()) return;
    lancer(async () => {
      const r = await ajouterCommentaire({ relationTo, id: cibleId, contenu });
      if (!r.ok) return void toast.error(r.erreur);
      setContenu("");
      onChange();
    });
  };

  const retirer = (id: number) => {
    lancer(async () => {
      const r = await supprimerCommentaire(id);
      if (!r.ok) return void toast.error(r.erreur);
      onChange();
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Commentaires</h3>
      {commentaires.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {commentaires.map((c) => (
            <li key={c.id} className="rounded-md bg-secondary/60 px-3 py-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{c.auteur || "Membre"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formaterDateCourte(c.creeLe)} {formaterHeure(c.creeLe)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{c.contenu}</p>
              {estAdmin || c.auteurId === utilisateurId ? (
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    disabled={enCours}
                    onClick={() => retirer(c.id)}
                  >
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un commentaire…"
          rows={2}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button type="button" variant="hubSecondary" size="sm" disabled={enCours || !contenu.trim()} onClick={envoyer}>
            Commenter
          </Button>
        </div>
      </div>
    </section>
  );
}
