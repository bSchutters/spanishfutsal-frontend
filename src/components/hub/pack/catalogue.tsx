"use client";

import { ImagePlus, Loader2, Plus, Shirt, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerArticle } from "@/hub/actions/pack";
import { formaterPrix } from "@/hub/pack/calculs";
import { lireTailles, type Article } from "@/hub/pack/schema";
import { cn } from "@/lib/utils";

type Photo = { id: number; url: string } | null;
type VarianteFormulaire = { cle: string; id: string | null; couleur: string; reference: string; photo: Photo };

let compteur = 0;
const nouvelleCle = () => `v${++compteur}`;

/** La vignette d'un article : la photo de sa premiere couleur, ou une icone. */
function Vignette({ photo, grande = false }: { photo: Photo; grande?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/40",
        grande ? "size-16" : "size-11",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" className="size-full object-cover" />
      ) : (
        <Shirt className="size-5 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}

/** Le depot d'une photo de couleur, par la route des photos du Hub. */
function DepotPhoto({ photo, nom, onChange }: { photo: Photo; nom: string; onChange: (photo: Photo) => void }) {
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
      const reponse = await fetch("/api/hub/photos", { method: "POST", body: corps, credentials: "include" });
      const json = (await reponse.json()) as { id?: number; url?: string; erreur?: string };
      if (!reponse.ok || typeof json.id !== "number") throw new Error(json.erreur ?? `${reponse.status}`);
      onChange({ id: json.id, url: json.url ?? "" });
    } catch (erreur) {
      toast.error(erreur instanceof Error && erreur.message ? erreur.message : "La photo n'a pas pu être déposée.");
    } finally {
      setEnCours(false);
      if (entree.current) entree.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Vignette photo={photo} grande />
      <input ref={entree} type="file" accept="image/*" className="sr-only" onChange={(e) => void deposer(e.target.files)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="hubSecondary" size="sm" disabled={enCours} onClick={() => entree.current?.click()}>
          {enCours ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
          {enCours ? "Dépôt…" : photo ? "Changer" : "Photo"}
        </Button>
        {photo ? (
          <Button type="button" variant="hubSecondary" size="sm" disabled={enCours} onClick={() => onChange(null)}>
            Retirer
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FicheArticle({
  article,
  onFermer,
  onEnregistre,
}: {
  article: Article | null;
  onFermer: () => void;
  onEnregistre: (article: Article) => void;
}) {
  const [nom, setNom] = useState(article?.nom ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [prix, setPrix] = useState(article ? String(article.prix).replace(".", ",") : "");
  const [tailles, setTailles] = useState(article ? article.tailles.join(", ") : "S, M, L, XL, XXL");
  const [floquable, setFloquable] = useState(article?.floquable ?? false);
  const [actif, setActif] = useState(article?.actif ?? true);
  const [variantes, setVariantes] = useState<VarianteFormulaire[]>(() =>
    article?.variantes.length
      ? article.variantes.map((v) => ({ cle: nouvelleCle(), id: v.id, couleur: v.couleur, reference: v.reference, photo: v.photo }))
      : [{ cle: nouvelleCle(), id: null, couleur: "", reference: "", photo: null }],
  );
  const [enCours, setEnCours] = useState(false);

  const changerVariante = (cle: string, partiel: Partial<VarianteFormulaire>) =>
    setVariantes((liste) => liste.map((v) => (v.cle === cle ? { ...v, ...partiel } : v)));

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    const r = await enregistrerArticle({
      id: article?.id ?? null,
      nom,
      description,
      prix: Number(prix.replace(",", ".")),
      tailles: lireTailles(tailles),
      floquable,
      actif,
      variantes: variantes.map((v) => ({ id: v.id, couleur: v.couleur, reference: v.reference, photoId: v.photo?.id ?? null })),
    });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(article ? "Article enregistré." : "Article ajouté au catalogue.");
    onEnregistre(r.donnees);
  };

  return (
    <form onSubmit={enregistrer} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="article-nom">Nom</Label>
          <Input id="article-nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="article-description">Description</Label>
          <Textarea id="article-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <p className="text-xs text-muted-foreground">Facultative, visible sur la page des joueurs.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="article-prix">Prix (€)</Label>
            <Input id="article-prix" inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} required className="h-10" />
            <p className="text-xs text-muted-foreground">Logo du club compris.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="article-tailles">Tailles</Label>
            <Input id="article-tailles" value={tailles} onChange={(e) => setTailles(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">Séparées par des virgules, dans l&apos;ordre.</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Floquable</span>
            <span className="block text-xs text-muted-foreground">Le joueur peut ajouter un numéro et un nom, avec supplément.</span>
          </span>
          <Switch checked={floquable} onCheckedChange={setFloquable} aria-label="Floquable" />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Dans le catalogue</span>
            <span className="block text-xs text-muted-foreground">Décoché, l&apos;article quitte la page des joueurs, mais reste dans les commandes passées.</span>
          </span>
          <Switch checked={actif} onCheckedChange={setActif} aria-label="Dans le catalogue" />
        </label>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Couleurs</p>
            <p className="text-xs text-muted-foreground">Chacune avec sa référence Joma et sa photo. Une seule couleur peut rester sans nom.</p>
          </div>
          {variantes.map((v, rang) => (
            <div key={v.cle} className="flex flex-col gap-3 rounded-md border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`couleur-${v.cle}`}>Couleur</Label>
                  <Input
                    id={`couleur-${v.cle}`}
                    value={v.couleur}
                    onChange={(e) => changerVariante(v.cle, { couleur: e.target.value })}
                    placeholder={variantes.length === 1 ? "Facultatif" : "Bleu, blanc…"}
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`reference-${v.cle}`}>Référence Joma</Label>
                  <Input
                    id={`reference-${v.cle}`}
                    value={v.reference}
                    onChange={(e) => changerVariante(v.cle, { reference: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <DepotPhoto
                  photo={v.photo}
                  nom={[nom, v.couleur].filter(Boolean).join(" ")}
                  onChange={(photo) => changerVariante(v.cle, { photo })}
                />
                {variantes.length > 1 ? (
                  <Button
                    type="button"
                    variant="hubSecondary"
                    size="sm"
                    aria-label={`Retirer la couleur ${v.couleur || rang + 1}`}
                    onClick={() => setVariantes((liste) => liste.filter((x) => x.cle !== v.cle))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="hubSecondary"
            size="sm"
            className="self-start"
            onClick={() => setVariantes((liste) => [...liste, { cle: nouvelleCle(), id: null, couleur: "", reference: "", photo: null }])}
          >
            <Plus aria-hidden="true" />
            Ajouter une couleur
          </Button>
        </div>
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
  );
}

/**
 * Le catalogue du Pack : les articles actifs, puis ceux retires, estompes.
 * Un clic ouvre la fiche ; en lecture seule, la liste ne s'ouvre pas.
 */
export default function Catalogue({ articles: initiaux, peutEditer }: { articles: Article[]; peutEditer: boolean }) {
  const [articles, setArticles] = useState(initiaux);
  const [ouverture, setOuverture] = useState<{ ouvert: boolean; article: Article | null; cle: number }>({
    ouvert: false,
    article: null,
    cle: 0,
  });

  const ouvrir = (article: Article | null) => setOuverture((o) => ({ ouvert: true, article, cle: o.cle + 1 }));
  const fermer = () => setOuverture((o) => ({ ...o, ouvert: false }));
  const enregistre = (article: Article) => {
    setArticles((liste) => {
      const autres = liste.filter((a) => a.id !== article.id);
      return [...autres, article].sort(
        (a, b) => Number(b.actif) - Number(a.actif) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
      );
    });
    fermer();
  };

  return (
    <Panneau
      titre="Catalogue"
      description="Les articles Joma proposés aux joueurs."
      actions={
        peutEditer ? (
          <Button type="button" variant="hub" size="sm" onClick={() => ouvrir(null)}>
            <Plus aria-hidden="true" />
            Ajouter
          </Button>
        ) : null
      }
    >
      {articles.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Aucun article pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y divide-border">
          {articles.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                disabled={!peutEditer}
                onClick={() => ouvrir(a)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
                  !a.actif && "opacity-50",
                )}
              >
                <Vignette photo={a.variantes.find((v) => v.photo)?.photo ?? null} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.nom}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[
                      a.variantes.map((v) => v.couleur).filter(Boolean).join(", "),
                      a.tailles.join(" "),
                      a.floquable ? "floquable" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {!a.actif ? <Etiquette>Retiré</Etiquette> : null}
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formaterPrix(a.prix)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={ouverture.ouvert} onOpenChange={(o) => !o && fermer()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <SheetTitle>{ouverture.article ? ouverture.article.nom : "Nouvel article"}</SheetTitle>
            <SheetDescription>Un article Joma du pack, avec ses couleurs et ses tailles.</SheetDescription>
          </SheetHeader>
          {/* Garde la fiche pendant l'animation de fermeture ; la cle la remonte a chaque ouverture. */}
          {ouverture.cle > 0 ? (
            <FicheArticle key={ouverture.cle} article={ouverture.article} onFermer={fermer} onEnregistre={enregistre} />
          ) : null}
        </SheetContent>
      </Sheet>
    </Panneau>
  );
}
