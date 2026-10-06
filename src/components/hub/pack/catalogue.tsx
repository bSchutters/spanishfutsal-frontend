"use client";

import { GripVertical, ImagePlus, Loader2, Plus, Shirt, Star, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerArticle, reordonnerArticles, supprimerArticle } from "@/hub/actions/pack";
import { formaterPrix, prixJoueur, referenceComplete, tauxRemise } from "@/hub/pack/calculs";
import {
  COULEURS_FLOCAGE_DEFAUT,
  DISPOSITION_FLOCAGE_DEFAUT,
  LIBELLES_LOGO,
  LIBELLES_MODE_REMISE,
  lireTailles,
  MODES_REMISE,
  type Article,
  type CoteDisposition,
  type CouleursFlocage,
  type DispositionFlocage,
  type ModeRemise,
  type VersionLogo,
  VERSIONS_LOGO,
} from "@/hub/pack/schema";
import { cn } from "@/lib/utils";
import ApercuFlocage, { ApercuLogo } from "./apercu-flocage";

type PhotoDeposee = { id: number; url: string };
type Photo = PhotoDeposee | null;
type VarianteFormulaire = {
  cle: string;
  id: string | null;
  couleur: string;
  codeCouleur: string;
  photos: PhotoDeposee[];
  photoDosId: number | null;
  couleursFlocage: CouleursFlocage;
  logo: VersionLogo;
};

const nombreSaisi = (texte: string) => (texte.trim() === "" ? NaN : Number(texte.replace(",", ".")));

let compteur = 0;
const nouvelleVariante = (): VarianteFormulaire => ({
  cle: `v${++compteur}`,
  id: null,
  couleur: "",
  codeCouleur: "",
  photos: [],
  photoDosId: null,
  couleursFlocage: { ...COULEURS_FLOCAGE_DEFAUT },
  logo: "club",
});

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
        <img src={photo.url} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <Shirt className="size-5 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}

/** Combien de photos une couleur peut porter. */
const PHOTOS_MAX = 10;

/** La liste avec la photo `id` deplacee au rang `rang`. */
function deplacer(photos: PhotoDeposee[], id: number, rang: number): PhotoDeposee[] {
  const photo = photos.find((p) => p.id === id);
  if (!photo) return photos;
  const reste = photos.filter((p) => p.id !== id);
  return [...reste.slice(0, rang), photo, ...reste.slice(rang)];
}

/**
 * Les photos d'une couleur, par la route des photos du Hub. La premiere est
 * la photo principale, celle de la vignette ; l'etoile en fait passer une
 * autre en tete, et l'ordre se change en glissant les vignettes. Plusieurs
 * fichiers se deposent d'un coup, l'un apres l'autre.
 */
function PhotosCouleur({
  photos,
  nom,
  onChange,
  photoDosId,
  onDos,
}: {
  photos: PhotoDeposee[];
  nom: string;
  onChange: (photos: PhotoDeposee[]) => void;
  /** Fournis pour un article floquable : la photo de dos, et son choix. */
  photoDosId?: number | null;
  onDos?: (id: number | null) => void;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(0);
  // La photo qu'on glisse : la liste se reordonne en direct sous le pointeur.
  const [tiree, setTiree] = useState<number | null>(null);
  const triable = photos.length > 1;

  const deposer = async (fichiers: FileList | null) => {
    const liste = Array.from(fichiers ?? []).slice(0, PHOTOS_MAX - photos.length);
    if (liste.length === 0) return;
    let suite = photos;
    for (const fichier of liste) {
      setEnCours((n) => n + 1);
      try {
        const corps = new FormData();
        corps.append("file", fichier, fichier.name);
        corps.append("alt", nom);
        const reponse = await fetch("/api/hub/photos", { method: "POST", body: corps, credentials: "include" });
        const json = (await reponse.json()) as { id?: number; url?: string; erreur?: string };
        if (!reponse.ok || typeof json.id !== "number") throw new Error(json.erreur ?? `${reponse.status}`);
        suite = [...suite, { id: json.id, url: json.url ?? "" }];
        onChange(suite);
      } catch (erreur) {
        toast.error(erreur instanceof Error && erreur.message ? erreur.message : `${fichier.name} n'a pas pu être déposée.`);
      } finally {
        setEnCours((n) => n - 1);
      }
    }
    if (entree.current) entree.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((p, rang) => (
            <li
              key={p.id}
              draggable={triable}
              onDragStart={(e) => {
                setTiree(p.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(p.id));
              }}
              onDragOver={(e) => {
                if (tiree === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (tiree !== p.id) onChange(deplacer(photos, tiree, rang));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setTiree(null);
              }}
              onDragEnd={() => setTiree(null)}
              className={cn("relative", triable && "cursor-grab active:cursor-grabbing", tiree === p.id && "opacity-40")}
            >
              <Vignette photo={p} grande />
              {rang === 0 ? (
                <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 text-center text-[10px] font-medium">Principale</span>
              ) : (
                <button
                  type="button"
                  aria-label="En faire la photo principale"
                  title="En faire la photo principale"
                  onClick={() => onChange([p, ...photos.filter((x) => x.id !== p.id)])}
                  className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
                >
                  <Star className="size-3.5" aria-hidden="true" />
                </button>
              )}
              {onDos ? (
                <button
                  type="button"
                  aria-pressed={p.id === photoDosId}
                  title={p.id === photoDosId ? "Photo de dos : porte l'aperçu du flocage" : "Marquer comme vue de dos"}
                  onClick={() => onDos(p.id === photoDosId ? null : p.id)}
                  className={cn(
                    "absolute top-1 left-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    p.id === photoDosId ? "bg-primary text-primary-foreground" : "bg-black/60 text-white/80 hover:bg-black/80",
                  )}
                >
                  Dos
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Retirer cette photo"
                onClick={() => onChange(photos.filter((x) => x.id !== p.id))}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {triable ? <p className="text-xs text-muted-foreground">Glissez les photos pour changer leur ordre.</p> : null}
      <input
        ref={entree}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void deposer(e.target.files)}
      />
      <Button
        type="button"
        variant="hubSecondary"
        size="sm"
        className="self-start"
        disabled={enCours > 0 || photos.length >= PHOTOS_MAX}
        onClick={() => entree.current?.click()}
      >
        {enCours > 0 ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
        {enCours > 0 ? "Dépôt…" : photos.length >= PHOTOS_MAX ? `${PHOTOS_MAX} photos au plus` : photos.length > 0 ? "Ajouter des photos" : "Photos"}
      </Button>
    </div>
  );
}

/** Les curseurs d'une disposition, en pourcentage de la photo, ou en degres pour un angle. */
function curseurDe(disposition: DispositionFlocage, onDisposition: (d: DispositionFlocage) => void) {
  return function curseur(cle: CoteDisposition, libelle: string, min: number, max: number, unite: "%" | "°" = "%") {
    return (
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex justify-between text-muted-foreground">
          {libelle}
          <span className="tabular-nums">
            {disposition[cle].toLocaleString("fr-BE")}
            {unite === "%" ? " %" : "°"}
          </span>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={disposition[cle]}
          onChange={(e) => onDisposition({ ...disposition, [cle]: Number(e.target.value) })}
          className="accent-primary"
        />
      </label>
    );
  };
}

/** Remet les reglages donnes a leur valeur par defaut, sans toucher aux autres. */
const remettre = (disposition: DispositionFlocage, cles: CoteDisposition[]): DispositionFlocage => ({
  ...disposition,
  ...Object.fromEntries(cles.map((cle) => [cle, DISPOSITION_FLOCAGE_DEFAUT[cle]])),
});

/**
 * Un bloc de la fiche : un titre, une phrase, une action dans l'en-tete (un
 * interrupteur), puis son contenu. Sans contenu, l'en-tete se suffit.
 */
function Bloc({
  titre,
  description,
  action,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & { titre: string; description?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)} {...props}>
      <div className={cn("flex items-start justify-between gap-4 px-4 py-3", children ? "border-b border-border" : "")}>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{titre}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Un groupe de reglages sous un petit titre, « Numéro », « Sponsors »... */
function Groupe({ titre, action, children }: { titre: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titre}</p>
        {action}
      </div>
      {children ? <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">{children}</div> : null}
    </div>
  );
}

/** Le choix de la couleur d'un apercu, des qu'il y en a plusieurs. */
function ChoixCouleur({ variantes, choisie, onChoisir }: { variantes: VarianteFormulaire[]; choisie: string; onChoisir: (cle: string) => void }) {
  if (variantes.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Couleur de l'aperçu">
      {variantes.map((v) => (
        <button
          key={v.cle}
          type="button"
          aria-pressed={v.cle === choisie}
          onClick={() => onChoisir(v.cle)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            v.cle === choisie ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          {v.couleur || "Sans nom"}
        </button>
      ))}
    </div>
  );
}

type Vue = "face" | "dos";

/**
 * L'article tel que le joueur le verra, sous les yeux pendant tous les
 * reglages : une couleur, sa face avec le logo du club, son dos avec les
 * sponsors, le numero et le nom d'essai, puis son nom et son prix.
 */
function ApercuArticle({
  nom,
  prix,
  variantes,
  couleur,
  onCouleur,
  vue,
  onVue,
  disposition,
  floquable,
  essaiNumero,
  essaiNom,
  onEssaiNumero,
  onEssaiNom,
}: {
  nom: string;
  prix: number | null;
  variantes: VarianteFormulaire[];
  couleur: string | null;
  onCouleur: (cle: string) => void;
  vue: Vue;
  onVue: (vue: Vue) => void;
  disposition: DispositionFlocage;
  floquable: boolean;
  essaiNumero: string;
  essaiNom: string;
  onEssaiNumero: (v: string) => void;
  onEssaiNom: (v: string) => void;
}) {
  const avecPhotos = variantes.filter((v) => v.photos.length > 0);
  const variante = avecPhotos.find((v) => v.cle === couleur) ?? avecPhotos[0];

  if (!variante) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-8 text-center text-sm text-muted-foreground">
        <Shirt className="size-8" aria-hidden="true" />
        Ajoutez des photos à une couleur : l&apos;article s&apos;affiche ici, tel que le joueur le verra.
      </div>
    );
  }

  const principale = variante.photos[0];
  const photoDos = variante.photos.find((p) => p.id === variante.photoDosId) ?? null;
  const dos = vue === "dos" && photoDos !== null;
  const photo = dos && photoDos ? photoDos : principale;
  // Le logo de la face avant ne se pose pas sur une photo principale qui serait celle du dos.
  const logoAvant = disposition.logoAvant && principale.id !== variante.photoDosId;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChoixCouleur variantes={avecPhotos} choisie={variante.cle} onChoisir={onCouleur} />
        <div className="ms-auto inline-flex rounded-md bg-secondary p-0.5" role="group" aria-label="Côté de l'article">
          {(["face", "dos"] as const).map((cote) => {
            const actif = (cote === "dos") === dos;
            const sansDos = cote === "dos" && !photoDos;
            return (
              <button
                key={cote}
                type="button"
                aria-pressed={actif}
                disabled={sansDos}
                title={sansDos ? "Marquez la photo de dos de cette couleur : bouton « Dos » sur sa vignette." : undefined}
                onClick={() => onVue(cote)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  actif ? "bg-background text-foreground shadow-sm" : "text-muted-foreground enabled:hover:text-foreground",
                )}
              >
                {cote === "face" ? "Face" : "Dos"}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" className="size-full object-contain" />
        {dos ? (
          floquable ? (
            <ApercuFlocage numero={essaiNumero} nom={essaiNom.trim()} couleurs={variante.couleursFlocage} disposition={disposition} logo={variante.logo} />
          ) : null
        ) : logoAvant ? (
          <ApercuLogo disposition={disposition} logo={variante.logo} />
        ) : null}
      </div>
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{[nom.trim() || "Nouvel article", variante.couleur].filter(Boolean).join(" · ")}</span>
        {prix !== null ? <span className="shrink-0 font-semibold tabular-nums">{formaterPrix(prix)}</span> : null}
      </p>
      {dos && floquable ? (
        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <Input
            aria-label="Numéro d'essai"
            inputMode="numeric"
            maxLength={2}
            value={essaiNumero}
            onChange={(e) => onEssaiNumero(e.target.value.replace(/\D/g, ""))}
          />
          <Input aria-label="Nom d'essai" value={essaiNom} onChange={(e) => onEssaiNom(e.target.value.toUpperCase())} />
        </div>
      ) : null}
    </div>
  );
}

/** Les reglages du logo de la face avant : sa place, puis de quoi suivre une photo de biais. */
function ReglagesLogo({ disposition, onDisposition }: { disposition: DispositionFlocage; onDisposition: (d: DispositionFlocage) => void }) {
  const curseur = curseurDe(disposition, onDisposition);
  return (
    <div className="flex flex-col gap-5 p-4">
      <Groupe titre="Place">
        {curseur("logoX", "Position horizontale", 5, 95)}
        {curseur("logoY", "Hauteur", 5, 80)}
        {curseur("logoTaille", "Taille", 2, 30)}
      </Groupe>
      <Groupe titre="Photo de biais">
        {curseur("logoLargeur", "Largeur", 30, 100)}
        {curseur("logoInclinaison", "Inclinaison", -45, 45, "°")}
        {curseur("logoRotation", "Rotation", -45, 45, "°")}
      </Groupe>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Sur la photo principale de chaque couleur : glissez la photo de face en premier.</p>
        <Button
          type="button"
          variant="hubSecondary"
          size="sm"
          onClick={() => onDisposition(remettre(disposition, ["logoX", "logoY", "logoTaille", "logoLargeur", "logoInclinaison", "logoRotation"]))}
        >
          Position par défaut
        </Button>
      </div>
    </div>
  );
}

/** Les reglages du flocage : le numero, le nom et les sponsors du club. */
function ReglagesFlocage({
  disposition,
  onDisposition,
  aUnDos,
}: {
  disposition: DispositionFlocage;
  onDisposition: (d: DispositionFlocage) => void;
  aUnDos: boolean;
}) {
  const curseur = curseurDe(disposition, onDisposition);
  return (
    <div className="flex flex-col gap-5 p-4">
      {aUnDos ? null : (
        <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          Marquez la photo de dos d&apos;une couleur (bouton « Dos » sur sa vignette) : le flocage s&apos;y place, et l&apos;aperçu le montre.
        </p>
      )}
      <Groupe titre="Numéro">
        {curseur("numeroY", "Hauteur", 10, 80)}
        {curseur("numeroHauteur", "Taille", 5, 40)}
      </Groupe>
      <Groupe titre="Nom">
        {curseur("nomY", "Hauteur", 5, 90)}
        {curseur("nomHauteur", "Taille", 1, 12)}
        {curseur("nomLargeurMax", "Largeur maximale", 10, 80)}
      </Groupe>
      <Groupe
        titre="Sponsors du club"
        action={
          <Switch
            checked={disposition.sponsors}
            onCheckedChange={(sponsors) => onDisposition({ ...disposition, sponsors })}
            aria-label="Sponsors du club"
          />
        }
      >
        {disposition.sponsors ? (
          <>
            {curseur("sponsorHautY", "Hauteur de Sofexia", 5, 60)}
            {curseur("sponsorBasY", "Hauteur de Wabee", 30, 95)}
            {curseur("sponsorLargeur", "Largeur", 5, 50)}
          </>
        ) : null}
      </Groupe>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Sofexia au-dessus du numéro, Wabee en dessous, dans la couleur des lettres.</p>
        <Button
          type="button"
          variant="hubSecondary"
          size="sm"
          onClick={() =>
            onDisposition(remettre(disposition, ["nomY", "nomHauteur", "nomLargeurMax", "numeroY", "numeroHauteur", "sponsorHautY", "sponsorBasY", "sponsorLargeur"]))
          }
        >
          Positions par défaut
        </Button>
      </div>
    </div>
  );
}

function FicheArticle({
  article,
  remiseGenerale,
  onFermer,
  onEnregistre,
  onSupprime,
}: {
  article: Article | null;
  remiseGenerale: number;
  onFermer: () => void;
  onEnregistre: (article: Article) => void;
  onSupprime: (id: number) => void;
}) {
  const [nom, setNom] = useState(article?.nom ?? "");
  const [confirmation, setConfirmation] = useState(false);
  const [reference, setReference] = useState(article?.reference ?? "");
  const [nomJoma, setNomJoma] = useState(article?.nomJoma ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [prixCatalogue, setPrixCatalogue] = useState(article ? String(article.prixCatalogue).replace(".", ",") : "");
  const [modeRemise, setModeRemise] = useState<ModeRemise>(article?.remise.mode ?? "general");
  const [remiseParticuliere, setRemiseParticuliere] = useState(
    article?.remise.taux !== null && article?.remise.taux !== undefined ? String(article.remise.taux).replace(".", ",") : "",
  );
  const remiseSaisie = {
    mode: modeRemise,
    taux: Number.isFinite(nombreSaisi(remiseParticuliere)) ? nombreSaisi(remiseParticuliere) : null,
  };
  const [tailles, setTailles] = useState(article ? article.tailles.join(", ") : "S, M, L, XL, XXL");
  const [floquable, setFloquable] = useState(article?.floquable ?? false);
  const [disposition, setDisposition] = useState<DispositionFlocage>({ ...DISPOSITION_FLOCAGE_DEFAUT, ...article?.dispositionFlocage });
  const [essaiNumero, setEssaiNumero] = useState("10");
  const [essaiNom, setEssaiNom] = useState("NOM");
  const [actif, setActif] = useState(article?.actif ?? true);
  const [variantes, setVariantes] = useState<VarianteFormulaire[]>(() =>
    article?.variantes.length
      ? article.variantes.map((v) => ({
          cle: nouvelleCle(),
          id: v.id,
          couleur: v.couleur,
          codeCouleur: v.codeCouleur,
          photos: v.photos,
          photoDosId: v.photoDosId,
          couleursFlocage: v.couleursFlocage,
          logo: v.logo,
        }))
      : [nouvelleVariante()],
  );
  const [enCours, setEnCours] = useState(false);
  // L'apercu suit ce qu'on regle : la couleur qu'on touche, la face pour le logo, le dos pour le flocage.
  const [couleurApercu, setCouleurApercu] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>("face");

  const changerVariante = (cle: string, partiel: Partial<VarianteFormulaire>) =>
    setVariantes((liste) => liste.map((v) => (v.cle === cle ? { ...v, ...partiel } : v)));
  const prix = Number.isFinite(nombreSaisi(prixCatalogue)) ? prixJoueur(nombreSaisi(prixCatalogue), remiseSaisie, remiseGenerale) : null;
  const aUnDos = variantes.some((v) => v.photoDosId !== null && v.photos.some((p) => p.id === v.photoDosId));

  const supprimer = async () => {
    if (!article) return;
    setEnCours(true);
    const r = await supprimerArticle(article.id);
    setEnCours(false);
    setConfirmation(false);
    if (!r.ok) return void toast.error(r.erreur);
    toast.success(`« ${article.nom} » est supprimé du catalogue.`);
    onSupprime(article.id);
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    const r = await enregistrerArticle({
      id: article?.id ?? null,
      nom,
      reference,
      nomJoma,
      description,
      prixCatalogue: nombreSaisi(prixCatalogue),
      modeRemise,
      remiseParticuliere: modeRemise === "custom" ? nombreSaisi(remiseParticuliere) : null,
      tailles: lireTailles(tailles),
      floquable,
      actif,
      dispositionFlocage: disposition,
      variantes: variantes.map((v) => ({
        id: v.id,
        couleur: v.couleur,
        codeCouleur: v.codeCouleur,
        photoIds: v.photos.map((p) => p.id),
        photoDosId: v.photoDosId,
        couleursFlocage: v.couleursFlocage,
        logo: v.logo,
      })),
    });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
    toast.success(article ? "Article enregistré." : "Article ajouté au catalogue.");
    onEnregistre(r.donnees);
  };

  return (
    <form onSubmit={enregistrer} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/*
          Sur grand ecran, les reglages a gauche et l'apercu a droite, qui reste en place pendant qu'on fait defiler.
          Sur telephone, tout se suit : l'apercu arrive juste avant les reglages du logo et du flocage.
        */}
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)] lg:grid-rows-[auto_auto_auto_auto_1fr] lg:items-start lg:gap-x-8 lg:px-8">
          <Bloc titre="L'article" className="lg:col-start-1">
            <div className="flex flex-col gap-4 p-4">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="article-nom">Nom affiché</Label>
                  <Input id="article-nom" value={nom} onChange={(e) => setNom(e.target.value)} required className="h-10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="article-reference">Référence Joma</Label>
                  <Input
                    id="article-reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="104263"
                    spellCheck={false}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="article-nom-joma">Nom Joma</Label>
                <Input
                  id="article-nom-joma"
                  value={nomJoma}
                  onChange={(e) => setNomJoma(e.target.value)}
                  placeholder="T-SHIRT MANCHES COURTES CHAMPIONSHIP VIII"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">Le nom chez Joma, celui du PDF de commande. Vide, le nom affiché le remplace.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="article-description">Description</Label>
                <Textarea id="article-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                <p className="text-xs text-muted-foreground">Facultative, visible sur la page des joueurs.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="article-tailles">Tailles</Label>
                <Input id="article-tailles" value={tailles} onChange={(e) => setTailles(e.target.value)} className="h-10" />
                <p className="text-xs text-muted-foreground">Séparées par des virgules, dans l&apos;ordre.</p>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-secondary/40 px-3 py-2.5">
                <span>
                  <span className="block text-sm font-medium">Dans le catalogue</span>
                  <span className="block text-xs text-muted-foreground">Décoché, l&apos;article quitte la page des joueurs, mais reste dans les commandes passées.</span>
                </span>
                <Switch checked={actif} onCheckedChange={setActif} aria-label="Dans le catalogue" />
              </label>
            </div>
          </Bloc>

          <Bloc titre="Prix" description="Le prix Joma, logo du club compris, puis la remise du club." className="lg:col-start-1">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="article-prix">Prix catalogue (€)</Label>
                <Input
                  id="article-prix"
                  inputMode="decimal"
                  value={prixCatalogue}
                  onChange={(e) => setPrixCatalogue(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="article-remise">Remise</Label>
                <Select value={modeRemise} onValueChange={(m) => setModeRemise(m as ModeRemise)}>
                  <SelectTrigger id="article-remise" className="w-full data-[size=default]:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES_REMISE.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m === "general" ? `${LIBELLES_MODE_REMISE[m]} (${remiseGenerale.toLocaleString("fr-BE")} %)` : LIBELLES_MODE_REMISE[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {modeRemise === "custom" ? (
                <div className="flex flex-col gap-1.5 sm:col-start-2">
                  <Label htmlFor="article-remise-particuliere">Remise de cet article (%)</Label>
                  <Input
                    id="article-remise-particuliere"
                    inputMode="decimal"
                    value={remiseParticuliere}
                    onChange={(e) => setRemiseParticuliere(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">Prix joueur</span>
              <span className="text-end">
                <span className="text-base font-semibold tabular-nums">{prix !== null ? formaterPrix(prix) : "?"}</span>
                {prix !== null ? (
                  <span className="ms-2 text-xs text-muted-foreground">remise de {tauxRemise(remiseSaisie, remiseGenerale).toLocaleString("fr-BE")} %</span>
                ) : null}
              </span>
            </div>
          </Bloc>

          <Bloc
            titre="Couleurs et photos"
            description="Chacune avec son code couleur Joma et ses photos ; la première photo est la principale. Une seule couleur peut rester sans nom."
            className="lg:col-start-1"
          >
            <div className="flex flex-col gap-3 p-4">
              {variantes.map((v, rang) => (
                <div
                  key={v.cle}
                  className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-3"
                  onFocusCapture={() => setCouleurApercu(v.cle)}
                  onPointerDownCapture={() => setCouleurApercu(v.cle)}
                >
                  {/* Avec plusieurs couleurs, chacune porte son numero et sa corbeille, en haut de sa carte. */}
                  {variantes.length > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Couleur {rang + 1}</p>
                      <Button
                        type="button"
                        variant="hubSecondary"
                        size="sm"
                        aria-label={`Retirer la couleur ${v.couleur || rang + 1}`}
                        onClick={() => setVariantes((liste) => liste.filter((x) => x.cle !== v.cle))}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
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
                      <Label htmlFor={`code-${v.cle}`}>Code couleur Joma</Label>
                      <Input
                        id={`code-${v.cle}`}
                        value={v.codeCouleur}
                        onChange={(e) => changerVariante(v.cle, { codeCouleur: e.target.value })}
                        placeholder="339"
                        spellCheck={false}
                        className="h-10"
                      />
                    </div>
                  </div>
                  {referenceComplete(reference, v.codeCouleur) ? (
                    <p className="-mt-1 text-xs text-muted-foreground">
                      Chez Joma : <span className="font-mono">{referenceComplete(reference, v.codeCouleur)}</span>
                    </p>
                  ) : null}
                  <PhotosCouleur
                    photos={v.photos}
                    nom={[nom, v.couleur].filter(Boolean).join(" ")}
                    onChange={(photos) => changerVariante(v.cle, { photos })}
                    photoDosId={v.photoDosId}
                    onDos={
                      floquable
                        ? (photoDosId) => {
                            changerVariante(v.cle, { photoDosId });
                            if (photoDosId !== null) setVue("dos");
                          }
                        : undefined
                    }
                  />
                  {floquable || disposition.logoAvant ? (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-3 text-xs">
                      <label className="flex items-center gap-2">
                        <span className="text-muted-foreground">Logo</span>
                        <Select value={v.logo} onValueChange={(logo) => changerVariante(v.cle, { logo: logo as VersionLogo })}>
                          <SelectTrigger size="sm" aria-label="Logo" className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VERSIONS_LOGO.map((l) => (
                              <SelectItem key={l} value={l}>
                                {LIBELLES_LOGO[l]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      {floquable ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-muted-foreground">Flocage</span>
                          {(
                            [
                              ["remplissage", "Lettre"],
                              ["contour", "Contour"],
                              ["exterieur", "Contour extérieur"],
                            ] as const
                          ).map(([cle, libelle]) => (
                            <label key={cle} className="flex cursor-pointer items-center gap-1.5">
                              <input
                                type="color"
                                value={v.couleursFlocage[cle]}
                                onChange={(e) => changerVariante(v.cle, { couleursFlocage: { ...v.couleursFlocage, [cle]: e.target.value } })}
                                className="size-6 cursor-pointer rounded border border-border bg-transparent"
                              />
                              {libelle}
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="hubSecondary"
                size="sm"
                className="self-start"
                onClick={() => setVariantes((liste) => [...liste, nouvelleVariante()])}
              >
                <Plus aria-hidden="true" />
                Ajouter une couleur
              </Button>
            </div>
          </Bloc>

          <section aria-label="Aperçu" className="lg:sticky lg:top-5 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:self-start">
            <ApercuArticle
              nom={nom}
              prix={prix}
              variantes={variantes}
              couleur={couleurApercu}
              onCouleur={setCouleurApercu}
              vue={vue}
              onVue={setVue}
              disposition={disposition}
              floquable={floquable}
              essaiNumero={essaiNumero}
              essaiNom={essaiNom}
              onEssaiNumero={setEssaiNumero}
              onEssaiNom={setEssaiNom}
            />
          </section>

          <Bloc
            titre="Logo sur la face avant"
            description="Le logo du club sur la photo de face, à la place réglée pour cet article."
            className="lg:col-start-1"
            onFocusCapture={() => setVue("face")}
            onPointerDownCapture={() => setVue("face")}
            action={
              <Switch
                checked={disposition.logoAvant}
                onCheckedChange={(logoAvant) => setDisposition((d) => ({ ...d, logoAvant }))}
                aria-label="Logo sur la face avant"
              />
            }
          >
            {disposition.logoAvant ? <ReglagesLogo disposition={disposition} onDisposition={setDisposition} /> : null}
          </Bloc>

          <Bloc
            titre="Flocage"
            description="Le joueur peut ajouter un numéro et un nom au dos, avec supplément."
            className="lg:col-start-1"
            onFocusCapture={() => setVue("dos")}
            onPointerDownCapture={() => setVue("dos")}
            action={<Switch checked={floquable} onCheckedChange={setFloquable} aria-label="Floquable" />}
          >
            {floquable ? <ReglagesFlocage disposition={disposition} onDisposition={setDisposition} aUnDos={aUnDos} /> : null}
          </Bloc>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:px-8">
        {article ? (
          <Button
            type="button"
            variant="hubSecondary"
            className="text-destructive"
            onClick={() => setConfirmation(true)}
            disabled={enCours}
          >
            <Trash2 aria-hidden="true" />
            Supprimer
          </Button>
        ) : null}
        <span className="flex-1" />
        <Button type="button" variant="hubSecondary" onClick={onFermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="submit" variant="hub" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {article?.nom} » ?</DialogTitle>
            <DialogDescription>
              Il disparaît du catalogue et de la page des joueurs. Les commandes déjà passées gardent leurs lignes, avec leur nom, leur
              référence et leur prix. Pour le cacher sans le supprimer, décochez plutôt « Dans le catalogue ».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="hubSecondary" onClick={() => setConfirmation(false)}>
              Garder
            </Button>
            <Button type="button" variant="hub" className="bg-destructive text-white hover:bg-destructive/90" disabled={enCours} onClick={() => void supprimer()}>
              Supprimer l&apos;article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

/**
 * Le catalogue du Pack : les articles actifs, puis ceux retires, estompes.
 * Un clic ouvre la fiche ; en lecture seule, la liste ne s'ouvre pas.
 * L'ordre se change en glissant les articles, ou aux fleches depuis leur
 * poignee : il s'enregistre au lacher, et la page des joueurs le suit. Un
 * article reste du cote des actifs ou de celui des retires.
 */
export default function Catalogue({
  articles: initiaux,
  peutEditer,
  remiseGenerale,
}: {
  articles: Article[];
  peutEditer: boolean;
  remiseGenerale: number;
}) {
  const [articles, setArticles] = useState(initiaux);
  const [ouverture, setOuverture] = useState<{ ouvert: boolean; article: Article | null; cle: number }>({
    ouvert: false,
    article: null,
    cle: 0,
  });
  // L'article qu'on glisse : la liste se reordonne en direct sous le pointeur.
  const [tiree, setTiree] = useState<number | null>(null);
  // La liste d'avant le glisser, rendue si l'article est lache hors de la liste ou sur Echap.
  const avant = useRef<Article[] | null>(null);
  const depose = useRef(false);
  // Un envoi a la fois : pendant qu'il part, seul le dernier ordre demande attend son tour.
  const envoi = useRef<{ enCours: boolean; suivant: number[] | null }>({ enCours: false, suivant: null });
  // Le rang de chaque article tel que la base le connait, pour revenir en arriere si un envoi echoue.
  const enBase = useRef(new Map(initiaux.map((a) => [a.id, a.ordre])));
  const triable = peutEditer && articles.length > 1;

  const tri = (a: Article, b: Article) => Number(b.actif) - Number(a.actif) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr");

  const ouvrir = (article: Article | null) => setOuverture((o) => ({ ouvert: true, article, cle: o.cle + 1 }));
  const fermer = () => setOuverture((o) => ({ ...o, ouvert: false }));
  const supprime = (id: number) => {
    setArticles((liste) => liste.filter((a) => a.id !== id));
    fermer();
  };
  const enregistre = (article: Article) => {
    setArticles((liste) => {
      const autres = liste.filter((a) => a.id !== article.id);
      return [...autres, article].sort(tri);
    });
    fermer();
  };

  // La liste avec l'article `id` au rang `rang`, chaque article renumerote a sa nouvelle place.
  const deplace = (liste: Article[], id: number, rang: number): Article[] => {
    const article = liste.find((a) => a.id === id);
    if (!article) return liste;
    const reste = liste.filter((a) => a.id !== id);
    return [...reste.slice(0, rang), article, ...reste.slice(rang)].map((a, i) => (a.ordre === i ? a : { ...a, ordre: i }));
  };

  // L'ordre affiche part en base ; s'il echoue, la liste reprend le dernier ordre enregistre.
  const enregistrerOrdre = async (liste: Article[]) => {
    envoi.current.suivant = liste.map((a) => a.id);
    if (envoi.current.enCours) return;
    envoi.current.enCours = true;
    while (envoi.current.suivant) {
      const ids = envoi.current.suivant;
      envoi.current.suivant = null;
      const r = await reordonnerArticles(ids).catch(() => ({
        ok: false as const,
        erreur: "L'ordre n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.",
      }));
      if (!r.ok) {
        envoi.current.suivant = null;
        setArticles((l) => l.map((a) => ({ ...a, ordre: enBase.current.get(a.id) ?? a.ordre })).sort(tri));
        toast.error(r.erreur);
        break;
      }
      ids.forEach((id, rang) => enBase.current.set(id, rang));
      if (!envoi.current.suivant) toast.success("Ordre enregistré.", { id: "ordre-catalogue" });
    }
    envoi.current.enCours = false;
  };

  // Depuis la poignee, les fleches font monter ou descendre l'article d'un rang.
  const auClavier = (e: React.KeyboardEvent<HTMLElement>, article: Article, rang: number) => {
    const pas = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (pas === 0) return;
    e.preventDefault();
    if (articles[rang + pas]?.actif !== article.actif) return;
    const suite = deplace(articles, article.id, rang + pas);
    setArticles(suite);
    void enregistrerOrdre(suite);
    // La poignee garde le focus, meme si sa ligne a change de place dans la page.
    const poignee = e.currentTarget;
    requestAnimationFrame(() => poignee.focus());
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
        <>
          {triable ? <p className="px-4 pt-3 text-xs text-muted-foreground">Glissez les articles pour changer leur ordre sur la page des joueurs.</p> : null}
          {/* Lache n'importe ou sur la liste, l'ordre affiche s'enregistre. */}
          <ul
            className="divide-y divide-border"
            onDragOver={(e) => {
              if (tiree === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              if (tiree === null) return;
              e.preventDefault();
              depose.current = true;
              setTiree(null);
              const precedente = avant.current;
              if (precedente && articles.some((a, rang) => a.id !== precedente[rang]?.id)) void enregistrerOrdre(articles);
            }}
          >
            {articles.map((a, rang) => (
              <li
                key={a.id}
                draggable={triable}
                onDragStart={(e) => {
                  avant.current = articles;
                  depose.current = false;
                  setTiree(a.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(a.id));
                }}
                onDragOver={() => {
                  if (tiree === null || tiree === a.id) return;
                  // Un actif reste parmi les actifs, un retire parmi les retires.
                  if (articles.find((x) => x.id === tiree)?.actif === a.actif) setArticles(deplace(articles, tiree, rang));
                }}
                onDragEnd={() => {
                  if (!depose.current && avant.current) setArticles(avant.current);
                  avant.current = null;
                  setTiree(null);
                }}
                className={cn(
                  "flex transition-colors",
                  peutEditer && "hover:bg-accent/40",
                  !a.actif && "opacity-50",
                  tiree === a.id && "opacity-40",
                )}
              >
                {triable ? (
                  // Pas un vrai bouton : Firefox ne lance pas de glisser depuis un bouton.
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Déplacer ${a.nom}`}
                    aria-keyshortcuts="ArrowUp ArrowDown"
                    title="Glissez, ou utilisez les flèches haut et bas"
                    onKeyDown={(e) => auClavier(e, a, rang)}
                    className="flex shrink-0 cursor-grab items-center ps-3 text-muted-foreground hover:text-foreground focus-visible:bg-accent/40 focus-visible:text-foreground focus-visible:outline-none active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" aria-hidden="true" />
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={!peutEditer}
                  onClick={() => ouvrir(a)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 py-3 pe-4 text-left focus-visible:bg-accent/40 focus-visible:outline-none",
                    triable ? "ps-2" : "ps-4",
                  )}
                >
                  <Vignette photo={a.variantes.find((v) => v.photos.length > 0)?.photos[0] ?? null} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.nom}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        a.reference,
                        a.variantes.map((v) => v.couleur).filter(Boolean).join(", "),
                        a.tailles.join(" "),
                        a.floquable ? "floquable" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {!a.actif ? <Etiquette>Retiré</Etiquette> : null}
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block text-sm font-semibold">{formaterPrix(a.prix)}</span>
                    {a.prix !== a.prixCatalogue ? (
                      <span className="block text-[11px] text-muted-foreground line-through">{formaterPrix(a.prixCatalogue)}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Une fenetre centree, presque plein ecran, plutot qu'un panneau glisse depuis le bord. */}
      <Dialog open={ouverture.ouvert} onOpenChange={(o) => !o && fermer()}>
        <DialogContent
          className="flex h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-3rem)] sm:max-w-[min(88rem,calc(100%-3rem))]"
          // Pas de clavier qui surgit sur telephone a l'ouverture : le nom n'est pas forcement ce qu'on vient changer.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pe-12 text-start lg:px-8">
            <DialogTitle>{ouverture.article ? ouverture.article.nom : "Nouvel article"}</DialogTitle>
            <DialogDescription>Un article Joma du pack : son prix, ses couleurs et son marquage, avec l&apos;aperçu du joueur.</DialogDescription>
          </DialogHeader>
          {/* Garde la fiche pendant l'animation de fermeture ; la cle la remonte a chaque ouverture. */}
          {ouverture.cle > 0 ? (
            <FicheArticle
              key={ouverture.cle}
              article={ouverture.article}
              remiseGenerale={remiseGenerale}
              onFermer={fermer}
              onEnregistre={enregistre}
              onSupprime={supprime}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Panneau>
  );
}
