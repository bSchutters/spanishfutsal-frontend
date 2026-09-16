"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerIdee } from "@/hub/actions/idees";
import { formaterDateCourte } from "@/hub/dates";
import type { IdeeCarte, IdeeDetail, MatchChoix } from "@/hub/idees/donnees";
import { SAISIE_IDEE_VIDE, schemaIdee, type SaisieIdee } from "@/hub/idees/schema";

export type ReferencesIdees = {
  reseaux: Array<{ id: number; nom: string }>;
  formats: Array<{ id: number; nom: string }>;
  matchs: MatchChoix[];
};

export type EtatFormulaireIdee = { mode: "creer" } | { mode: "modifier"; idee: IdeeCarte };

const AUCUN = "aucun";

function CasesACocher({
  options,
  valeurs,
  onChange,
}: {
  options: Array<{ id: number; nom: string }>;
  valeurs: number[];
  onChange: (v: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={valeurs.includes(o.id)}
            onCheckedChange={(coche) => onChange(coche ? [...valeurs, o.id] : valeurs.filter((id) => id !== o.id))}
          />
          {o.nom}
        </label>
      ))}
    </div>
  );
}

/** Le formulaire d'une idee : court, pour noter vite depuis un telephone. */
export default function FormulaireIdee({
  etat,
  references,
  onFermer,
  onEnregistre,
}: {
  etat: EtatFormulaireIdee | null;
  references: ReferencesIdees;
  onFermer: () => void;
  onEnregistre: (idee: IdeeDetail) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const form = useForm<SaisieIdee>({ resolver: standardSchemaResolver(schemaIdee), defaultValues: SAISIE_IDEE_VIDE });

  useEffect(() => {
    if (!etat) return;
    if (etat.mode === "modifier") {
      const i = etat.idee;
      form.reset({
        id: i.id,
        titre: i.titre,
        description: i.description,
        reseauxIds: i.reseauxIds,
        formatIds: i.formatIds,
        lienInspiration: i.lienInspiration,
        matchLieId: i.matchLieId,
      });
    } else {
      form.reset(SAISIE_IDEE_VIDE);
    }
  }, [etat, form]);

  const envoyer = async (valeurs: SaisieIdee) => {
    setEnCours(true);
    const r = await enregistrerIdee(valeurs);
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(valeurs.id ? "Idée modifiée." : "Idée ajoutée.");
    onEnregistre(r.donnees);
  };

  return (
    <Sheet open={etat !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle>{etat?.mode === "modifier" ? "Modifier l'idée" : "Nouvelle idée"}</SheetTitle>
          <SheetDescription>Un titre suffit, le reste peut venir plus tard.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(envoyer)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
              <FormField
                control={form.control}
                name="titre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="L'idée en quelques lignes…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reseauxIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Réseaux envisagés</FormLabel>
                    <CasesACocher options={references.reseaux} valeurs={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="formatIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formats envisagés</FormLabel>
                    <CasesACocher options={references.formats} valeurs={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lienInspiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lien d&apos;inspiration</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" inputMode="url" placeholder="https://" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="matchLieId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match lié</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : AUCUN}
                      onValueChange={(v) => field.onChange(v === AUCUN ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AUCUN}>Aucun</SelectItem>
                        {references.matchs.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {formaterDateCourte(m.debut)} · {m.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <Button type="button" variant="hubSecondary" onClick={onFermer} disabled={enCours}>
                Annuler
              </Button>
              <Button type="submit" variant="hub" disabled={enCours}>
                {enCours ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
