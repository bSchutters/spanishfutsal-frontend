"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { enregistrerJoueur } from "@/hub/actions/joueurs";
import type { JoueurFiche } from "@/hub/joueurs/donnees";
import {
  ageAu,
  LIBELLES_POSTE,
  POSTES,
  SAISIE_JOUEUR_VIDE,
  schemaJoueur,
  type SaisieJoueur,
} from "@/hub/joueurs/fiche";
import { surLaFeuille } from "@/hub/joueurs/schema";

export type EtatFormulaireJoueur =
  { mode: "creer" } | { mode: "modifier"; joueur: JoueurFiche };

const AUCUN = "aucun";

/** Un champ numerique qui accepte le vide : le formulaire garde un nombre ou null. */
function ChampNombre({
  valeur,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  valeur: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={valeur === null ? "" : String(valeur)}
      onChange={(e) => {
        const texte = e.target.value.replace(/\D/g, "");
        onChange(texte === "" ? null : Number(texte));
      }}
      {...props}
    />
  );
}

/** La photo de la fiche : l'apercu, le depot d'une nouvelle image, le retrait. */
function Photo({
  photo,
  nom,
  onChange,
}: {
  photo: { id: number; url: string } | null;
  nom: string;
  onChange: (photo: { id: number; url: string } | null) => void;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);

  const deposer = async (fichiers: FileList | null) => {
    const fichier = fichiers?.[0];
    if (!fichier) return;
    setEnCours(true);
    try {
      const corps = new FormData();
      corps.append("file", fichier, fichier.name);
      corps.append("alt", nom);
      const reponse = await fetch("/api/hub/photos", {
        method: "POST",
        body: corps,
        credentials: "include",
      });
      const json = (await reponse.json()) as {
        id?: number;
        url?: string;
        erreur?: string;
      };
      if (!reponse.ok || typeof json.id !== "number")
        throw new Error(json.erreur ?? `${reponse.status}`);
      onChange({ id: json.id, url: json.url ?? "" });
    } catch (erreur) {
      toast.error(
        erreur instanceof Error && erreur.message
          ? erreur.message
          : "La photo n'a pas pu être déposée.",
      );
    } finally {
      setEnCours(false);
      if (entree.current) entree.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/40">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt=""
            className="size-full object-cover object-top"
          />
        ) : (
          <ImagePlus
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </span>
      <div className="flex flex-col gap-2">
        <input
          ref={entree}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void deposer(e.target.files)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="hubSecondary"
            size="sm"
            disabled={enCours}
            onClick={() => entree.current?.click()}
          >
            {enCours ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus aria-hidden="true" />
            )}
            {enCours
              ? "Dépôt en cours…"
              : photo
                ? "Changer la photo"
                : "Ajouter une photo"}
          </Button>
          {photo ? (
            <Button
              type="button"
              variant="hubSecondary"
              size="sm"
              disabled={enCours}
              onClick={() => onChange(null)}
            >
              <X aria-hidden="true" />
              Retirer
            </Button>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          Convertie et redimensionnée comme les images du site.
        </span>
      </div>
    </div>
  );
}

function saisieDe(j: JoueurFiche): SaisieJoueur {
  return {
    id: j.id,
    prenom: j.prenom,
    nom: j.nom,
    poste: j.poste,
    numero: j.numero,
    dateNaissance: j.dateNaissance ?? "",
    capitaine: j.capitaine,
    actif: j.actif,
    photoId: j.photo?.id ?? null,
  };
}

/**
 * La fiche d'un joueur, en panneau lateral : identite, poste, photo, date
 * de naissance, numero, capitaine, actif. Le panneau reste, le formulaire
 * se recree pour chaque fiche ouverte : ses valeurs de depart viennent de
 * la fiche, sans effet.
 */
export default function FormulaireJoueur({
  etat,
  onFermer,
  onEnregistre,
}: {
  etat: EtatFormulaireJoueur | null;
  onFermer: () => void;
  onEnregistre: (joueur: JoueurFiche) => void;
}) {
  return (
    <Sheet
      open={etat !== null}
      onOpenChange={(ouvert) => !ouvert && onFermer()}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle>
            {etat?.mode === "modifier"
              ? `${etat.joueur.prenom} ${etat.joueur.nom}`
              : "Nouvelle fiche"}
          </SheetTitle>
          <SheetDescription>
            {etat?.mode === "modifier"
              ? "La fiche de la collection Joueurs, celle du site."
              : "Un joueur, un gardien ou un membre du staff."}
          </SheetDescription>
        </SheetHeader>
        {etat ? (
          <Fiche
            key={etat.mode === "modifier" ? etat.joueur.id : "creer"}
            etat={etat}
            onFermer={onFermer}
            onEnregistre={onEnregistre}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Fiche({
  etat,
  onFermer,
  onEnregistre,
}: {
  etat: EtatFormulaireJoueur;
  onFermer: () => void;
  onEnregistre: (joueur: JoueurFiche) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const [photo, setPhoto] = useState(
    etat.mode === "modifier" ? etat.joueur.photo : null,
  );
  const form = useForm<SaisieJoueur>({
    resolver: standardSchemaResolver(schemaJoueur),
    defaultValues:
      etat.mode === "modifier" ? saisieDe(etat.joueur) : SAISIE_JOUEUR_VIDE,
  });

  const [poste, prenom, nom, dateNaissance] = useWatch({
    control: form.control,
    name: ["poste", "prenom", "nom", "dateNaissance"],
  });
  const surFeuille = poste === null || surLaFeuille(poste);
  const age = ageAu(dateNaissance || null, new Date());

  const envoyer = async (valeurs: SaisieJoueur) => {
    setEnCours(true);
    const r = await enregistrerJoueur({
      ...valeurs,
      photoId: photo?.id ?? null,
    });
    setEnCours(false);
    if (!r.ok || !r.donnees)
      return void toast.error(
        r.ok ? "Enregistré, mais impossible à relire." : r.erreur,
      );
    toast.success(
      valeurs.id
        ? "Fiche enregistrée."
        : `${valeurs.prenom} ajouté à l'effectif.`,
    );
    onEnregistre(r.donnees);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(envoyer)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          <Photo
            photo={photo}
            nom={`${prenom} ${nom}`.trim()}
            onChange={setPhoto}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="poste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste</FormLabel>
                  <Select
                    value={field.value ?? AUCUN}
                    onValueChange={(v) =>
                      field.onChange(v === AUCUN ? null : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {POSTES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {LIBELLES_POSTE[p]}
                        </SelectItem>
                      ))}
                      <SelectItem value={AUCUN}>Non renseigné</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateNaissance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date de naissance{age !== null ? ` · ${age} ans` : ""}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {surFeuille ? (
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro</FormLabel>
                  <FormControl>
                    <ChampNombre
                      valeur={field.value}
                      onChange={field.onChange}
                      maxLength={2}
                      className="w-24"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Celui du site et de la feuille de match.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Le staff n&apos;a pas de numéro.
            </p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {surFeuille ? (
              <FormField
                control={form.control}
                name="capitaine"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(c) => field.onChange(c === true)}
                        />
                      </FormControl>
                      Capitaine
                    </label>
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="actif"
              render={({ field }) => (
                <FormItem>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                    </FormControl>
                    Dans l&apos;effectif actuel
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Décoché, la fiche reste, mais sort du site et de la feuille.
                  </p>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="hubSecondary"
            onClick={onFermer}
            disabled={enCours}
          >
            Annuler
          </Button>
          <Button type="submit" variant="hub" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
