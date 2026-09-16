"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { addMinutes } from "date-fns";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Pastille } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerEvenement } from "@/hub/actions/evenements";
import type { EvenementDetail, References } from "@/hub/calendrier/donnees";
import {
  JOURS,
  LIBELLES_STATUT,
  SAISIE_VIDE,
  STATUTS,
  schemaEvenement,
  type SaisieEvenement,
} from "@/hub/calendrier/schema";
import { depuisChampDateHeure, versChampDate, versChampDateHeure } from "@/hub/dates";

export type EtatFormulaire =
  | { mode: "creer"; debut?: Date; journeeEntiere?: boolean }
  | { mode: "modifier"; detail: EvenementDetail };

function depuisDetail(detail: EvenementDetail): SaisieEvenement {
  return {
    id: detail.id,
    titre: detail.titre,
    typeId: detail.typeId,
    debut: versChampDateHeure(detail.debut),
    fin: versChampDateHeure(detail.fin),
    journeeEntiere: detail.journeeEntiere,
    heureRdv: versChampDateHeure(detail.heureRdv),
    lieuNom: detail.lieuNom ?? "",
    lieuAdresse: detail.lieuAdresse ?? "",
    fluxIds: detail.fluxIds,
    fluxPrincipalId: detail.fluxPrincipalId,
    responsablesIds: detail.responsablesIds,
    description: detail.description,
    notesInternes: detail.notesInternes,
    annule: detail.annule,
    pasDeRappel: detail.pasDeRappel,
    recurrence: {
      frequence: detail.recurrence.frequence,
      intervalle: detail.recurrence.intervalle,
      jours: detail.recurrence.jours as SaisieEvenement["recurrence"]["jours"],
      jusquAu: detail.recurrence.jusquAu ? versChampDate(detail.recurrence.jusquAu) : "",
    },
    post: {
      statut: detail.post.statut,
      reseauxIds: detail.post.reseauxIds,
      formatId: detail.post.formatId,
      legende: detail.post.legende,
      lienVisuels: detail.post.lienVisuels,
      lienPublication: detail.post.lienPublication,
      vues: detail.post.vues,
      matchLieId: detail.post.matchLieId,
    },
    match: {
      adversaire: detail.match.adversaire,
      domicile: detail.match.domicile,
      competition: detail.match.competition,
    },
  };
}

function CasesACocher({
  options,
  valeurs,
  onChange,
  couleurs,
}: {
  options: Array<{ id: number; nom: string }>;
  valeurs: number[];
  onChange: (v: number[]) => void;
  couleurs?: Map<number, string | null>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={valeurs.includes(o.id)}
            onCheckedChange={(coche) => onChange(coche ? [...valeurs, o.id] : valeurs.filter((id) => id !== o.id))}
          />
          {couleurs ? <Pastille couleur={couleurs.get(o.id)} /> : null}
          {o.nom}
        </label>
      ))}
    </div>
  );
}

/**
 * Le formulaire unique des evenements. Les sections suivent la categorie du
 * type choisi. Sur un match LFFS, les champs synchronises sont verrouilles :
 * le serveur les ignore de toute facon.
 */
export default function FormulaireEvenement({
  etat,
  references,
  onFermer,
  onEnregistre,
}: {
  etat: EtatFormulaire | null;
  references: References;
  onFermer: () => void;
  onEnregistre: (detail: EvenementDetail) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const fluxTouches = useRef(false);
  const form = useForm<SaisieEvenement>({
    resolver: standardSchemaResolver(schemaEvenement),
    defaultValues: SAISIE_VIDE,
  });

  const couleursFlux = useMemo(() => new Map(references.flux.map((f) => [f.id, f.couleur])), [references.flux]);
  const verrouille = etat?.mode === "modifier" && etat.detail.verrouille;

  useEffect(() => {
    if (!etat) return;
    fluxTouches.current = etat.mode === "modifier";
    if (etat.mode === "modifier") {
      form.reset(depuisDetail(etat.detail));
      return;
    }
    const premierType = references.types[0];
    const debut = etat.debut ?? new Date();
    if (!etat.debut) debut.setMinutes(0, 0, 0);
    form.reset({
      ...SAISIE_VIDE,
      typeId: premierType?.id ?? 0,
      fluxIds: premierType?.fluxParDefaut ?? [],
      debut: versChampDateHeure(debut),
      fin: etat.journeeEntiere ? "" : versChampDateHeure(addMinutes(debut, 60)),
      journeeEntiere: etat.journeeEntiere ?? false,
    });
  }, [etat, form, references.types]);

  const typeId = useWatch({ control: form.control, name: "typeId" });
  const fluxChoisis = useWatch({ control: form.control, name: "fluxIds" });
  const journeeEntiere = useWatch({ control: form.control, name: "journeeEntiere" });
  const frequence = useWatch({ control: form.control, name: "recurrence.frequence" });
  const type = references.types.find((t) => t.id === typeId);
  const categorie = type?.categorie ?? "other";

  // Un changement de type pre-coche ses flux, tant que la personne n'a pas
  // touche aux flux elle-meme. Un match cree ici est manuel : flux Joueurs.
  const changerType = (id: number) => {
    form.setValue("typeId", id, { shouldDirty: true });
    const nouveau = references.types.find((t) => t.id === id);
    if (!nouveau || fluxTouches.current) return;
    if (nouveau.categorie === "match") {
      const joueurs = references.flux.find((f) => f.slug === "joueurs");
      form.setValue("fluxIds", joueurs ? [joueurs.id] : nouveau.fluxParDefaut);
    } else {
      form.setValue("fluxIds", nouveau.fluxParDefaut);
    }
  };

  // La fin et l'heure de rendez-vous suivent la categorie quand elles sont vides.
  const proposerLesHeures = () => {
    const debutIso = depuisChampDateHeure(form.getValues("debut"));
    if (!debutIso) return;
    const debut = new Date(debutIso);
    if (!form.getValues("fin") && !form.getValues("journeeEntiere")) {
      const duree =
        categorie === "match"
          ? references.reglages.dureeMatchMinutes
          : categorie === "training"
            ? references.reglages.dureeEntrainementMinutes
            : 60;
      form.setValue("fin", versChampDateHeure(addMinutes(debut, duree)));
    }
    if (categorie === "match" && !form.getValues("heureRdv")) {
      form.setValue("heureRdv", versChampDateHeure(addMinutes(debut, -references.reglages.delaiRdvMatchMinutes)));
    }
  };

  const envoyer = async (valeurs: SaisieEvenement) => {
    setEnCours(true);
    const r = await enregistrerEvenement(valeurs);
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(valeurs.id ? "Événement modifié." : "Événement créé.");
    onEnregistre(r.donnees);
  };

  return (
    <Sheet open={etat !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>{etat?.mode === "modifier" ? "Modifier l'événement" : "Nouvel événement"}</SheetTitle>
          <SheetDescription>
            {verrouille
              ? "Match synchronisé avec la LFFS : le titre, les dates et le lieu suivent la fédération."
              : "Titre, type, début et au moins un flux sont obligatoires."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(envoyer)} className="flex flex-col gap-5 px-5 py-4">
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => changerType(Number(v))}
                    disabled={verrouille}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {references.types.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          <span className="flex items-center gap-2">
                            <Pastille couleur={t.couleur} />
                            {t.nom}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="titre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Titre {verrouille ? <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={verrouille} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Début {verrouille ? <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={verrouille} onBlur={() => { field.onBlur(); proposerLesHeures(); }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={verrouille || journeeEntiere} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <FormField
                control={form.control}
                name="journeeEntiere"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={verrouille} />
                    </FormControl>
                    <FormLabel className="font-normal">Journée entière</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="annule"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Annulé</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pasDeRappel"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Pas de rappel</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {categorie === "match" || categorie === "training" ? (
              <FormField
                control={form.control}
                name="heureRdv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de rendez-vous</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lieuNom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Lieu {verrouille ? <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} disabled={verrouille} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lieuAdresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={verrouille} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {fluxChoisis.length > 1 ? (
              <FormField
                control={form.control}
                name="fluxPrincipalId"
                render={({ field }) => {
                  const principal = field.value && fluxChoisis.includes(field.value) ? field.value : fluxChoisis[0];
                  return (
                    <FormItem>
                      <FormLabel>Flux principal</FormLabel>
                      <Select value={String(principal)} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger className="w-full sm:w-64">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {references.flux
                            .filter((f) => fluxChoisis.includes(f.id))
                            .map((f) => (
                              <SelectItem key={f.id} value={String(f.id)}>
                                <span className="flex items-center gap-2">
                                  <Pastille couleur={f.couleur} />
                                  {f.nom}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Donne sa couleur à l&apos;événement dans le calendrier.</p>
                    </FormItem>
                  );
                }}
              />
            ) : null}

            <FormField
              control={form.control}
              name="fluxIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flux</FormLabel>
                  <CasesACocher
                    options={references.flux}
                    valeurs={field.value}
                    couleurs={couleursFlux}
                    onChange={(v) => {
                      fluxTouches.current = true;
                      field.onChange(v);
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsablesIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsables</FormLabel>
                  <CasesACocher options={references.responsables} valeurs={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />

            {categorie === "match" && !verrouille ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="match.adversaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adversaire</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="off" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="match.competition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compétition</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Amical, tournoi…" autoComplete="off" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="match.domicile"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">À domicile</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {categorie === "post" ? (
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Publication</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="post.statut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUTS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {LIBELLES_STATUT[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="post.formatId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select
                          value={field.value ? String(field.value) : "aucun"}
                          onValueChange={(v) => field.onChange(v === "aucun" ? null : Number(v))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="aucun">Aucun</SelectItem>
                            {references.formats.map((f) => (
                              <SelectItem key={f.id} value={String(f.id)}>
                                {f.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="post.reseauxIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Réseaux</FormLabel>
                      <CasesACocher options={references.reseaux} valeurs={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="post.legende"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Légende</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={5} placeholder="Le texte à copier-coller au moment de publier…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="post.lienVisuels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien des visuels</FormLabel>
                        <FormControl>
                          <Input type="url" inputMode="url" {...field} placeholder="https://…" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="post.lienPublication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien de la publication</FormLabel>
                        <FormControl>
                          <Input type="url" inputMode="url" {...field} placeholder="https://…" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="post.vues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vues</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Visible dans les flux." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notesInternes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Hub uniquement, jamais dans les flux." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!verrouille ? (
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Récurrence</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="recurrence.frequence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fréquence</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Aucune</SelectItem>
                            <SelectItem value="weekly">Chaque semaine</SelectItem>
                            <SelectItem value="monthly">Chaque mois</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  {frequence !== "none" ? (
                    <FormField
                      control={form.control}
                      name="recurrence.intervalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Toutes les</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={52}
                                className="w-20"
                                value={field.value}
                                onChange={(e) => field.onChange(Math.max(1, Number(e.target.value) || 1))}
                              />
                              <span className="text-sm text-muted-foreground">
                                {frequence === "weekly" ? "semaines" : "mois"}
                              </span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
                {frequence === "weekly" ? (
                  <FormField
                    control={form.control}
                    name="recurrence.jours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jours</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {JOURS.map((j) => {
                            const coche = field.value.includes(j.valeur);
                            return (
                              <Label
                                key={j.valeur}
                                className={
                                  coche
                                    ? "cursor-pointer rounded-md border border-primary bg-primary/15 px-2.5 py-1 text-sm"
                                    : "cursor-pointer rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground"
                                }
                              >
                                <Checkbox
                                  className="sr-only"
                                  checked={coche}
                                  onCheckedChange={(v) =>
                                    field.onChange(v ? [...field.value, j.valeur] : field.value.filter((x) => x !== j.valeur))
                                  }
                                />
                                {j.libelle}
                              </Label>
                            );
                          })}
                        </div>
                      </FormItem>
                    )}
                  />
                ) : null}
                {frequence !== "none" ? (
                  <FormField
                    control={form.control}
                    name="recurrence.jusquAu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jusqu&apos;au</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="w-48" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-border bg-background px-5 py-3">
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
