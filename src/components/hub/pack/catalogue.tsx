"use client";

import { ImagePlus, Loader2, Plus, Shirt, Star, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Etiquette, Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerArticle, supprimerArticle } from "@/hub/actions/pack";
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

/**
 * Le logo du club sur la face avant, regle sur la photo principale d'une
 * couleur : sa place et sa taille sont propres a l'article.
 */
function ReglageLogo({
  variantes,
  disposition,
  onDisposition,
}: {
  variantes: VarianteFormulaire[];
  disposition: DispositionFlocage;
  onDisposition: (d: DispositionFlocage) => void;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const avecPhoto = variantes.filter((v) => v.photos.length > 0);
  const variante = avecPhoto.find((v) => v.cle === choisie) ?? avecPhoto[0];
  const curseur = curseurDe(disposition, onDisposition);

  if (!variante) {
    return (
      <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
        Ajoutez une photo de face dans une couleur : le logo s&apos;y pose, et sa place se règle ici.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Aperçu du logo</p>
      <ChoixCouleur variantes={avecPhoto} choisie={variante.cle} onChoisir={setChoisie} />
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={variante.photos[0].url} alt="" className="size-full object-contain" />
        <ApercuLogo disposition={disposition} logo={variante.logo} />
      </div>
      <p className="text-xs text-muted-foreground">Le logo se pose sur la photo principale de chaque couleur : glissez la photo de face en premier.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {curseur("logoX", "Position horizontale", 5, 95)}
        {curseur("logoY", "Hauteur du logo", 5, 80)}
        {curseur("logoTaille", "Taille du logo", 2, 30)}
        {curseur("logoLargeur", "Largeur (vue de biais)", 30, 100)}
        {curseur("logoInclinaison", "Inclinaison", -45, 45, "°")}
        {curseur("logoRotation", "Rotation", -45, 45, "°")}
      </div>
      <Button
        type="button"
        variant="hubSecondary"
        size="sm"
        className="self-start"
        onClick={() => onDisposition(remettre(disposition, ["logoX", "logoY", "logoTaille", "logoLargeur", "logoInclinaison", "logoRotation"]))}
      >
        Position par défaut
      </Button>
    </div>
  );
}

/**
 * La position du flocage, reglee sur la photo de dos d'une couleur (la
 * premiere qui en a une, ou celle choisie) : les sponsors, le nom et le
 * numero d'essai s'y dessinent en direct.
 */
function ReglageFlocage({
  variantes,
  disposition,
  onDisposition,
  essaiNumero,
  essaiNom,
  onEssaiNumero,
  onEssaiNom,
}: {
  variantes: VarianteFormulaire[];
  disposition: DispositionFlocage;
  onDisposition: (d: DispositionFlocage) => void;
  essaiNumero: string;
  essaiNom: string;
  onEssaiNumero: (v: string) => void;
  onEssaiNom: (v: string) => void;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const avecPhotoDos = variantes.filter((v) => v.photoDosId !== null && v.photos.some((p) => p.id === v.photoDosId));
  const avecDos = avecPhotoDos.find((v) => v.cle === choisie) ?? avecPhotoDos[0];
  const photoDos = avecDos?.photos.find((p) => p.id === avecDos.photoDosId) ?? null;
  const curseur = curseurDe(disposition, onDisposition);

  if (!avecDos || !photoDos) {
    return (
      <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
        Marquez une photo « Dos » dans une couleur : le joueur verra son flocage dessus, et la position se règle ici.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Aperçu du flocage</p>
      <ChoixCouleur variantes={avecPhotoDos} choisie={avecDos.cle} onChoisir={setChoisie} />
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoDos.url} alt="" className="size-full object-contain" />
        <ApercuFlocage numero={essaiNumero} nom={essaiNom.trim()} couleurs={avecDos.couleursFlocage} disposition={disposition} logo={avecDos.logo} />
      </div>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Input aria-label="Numéro d'essai" inputMode="numeric" maxLength={2} value={essaiNumero} onChange={(e) => onEssaiNumero(e.target.value.replace(/\D/g, ""))} />
        <Input aria-label="Nom d'essai" value={essaiNom} onChange={(e) => onEssaiNom(e.target.value.toUpperCase())} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {curseur("nomY", "Hauteur du nom", 5, 90)}
        {curseur("nomHauteur", "Taille du nom", 1, 12)}
        {curseur("numeroY", "Hauteur du numéro", 10, 80)}
        {curseur("numeroHauteur", "Taille du numéro", 5, 40)}
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          Sponsors du club
          <span className="block text-xs text-muted-foreground">Sofexia au-dessus du numéro, Wabee en dessous, dans la couleur des lettres.</span>
        </span>
        <Switch
          checked={disposition.sponsors}
          onCheckedChange={(sponsors) => onDisposition({ ...disposition, sponsors })}
          aria-label="Sponsors du club"
        />
      </label>
      {disposition.sponsors ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {curseur("sponsorHautY", "Hauteur de Sofexia", 5, 60)}
          {curseur("sponsorBasY", "Hauteur de Wabee", 30, 95)}
          {curseur("sponsorLargeur", "Largeur des sponsors", 5, 50)}
        </div>
      ) : null}
      <Button
        type="button"
        variant="hubSecondary"
        size="sm"
        className="self-start"
        onClick={() =>
          onDisposition(remettre(disposition, ["nomY", "nomHauteur", "numeroY", "numeroHauteur", "sponsorHautY", "sponsorBasY", "sponsorLargeur"]))
        }
      >
        Positions par défaut
      </Button>
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

  const changerVariante = (cle: string, partiel: Partial<VarianteFormulaire>) =>
    setVariantes((liste) => liste.map((v) => (v.cle === cle ? { ...v, ...partiel } : v)));

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
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="article-nom">Nom</Label>
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
          <Label htmlFor="article-description">Description</Label>
          <Textarea id="article-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <p className="text-xs text-muted-foreground">Facultative, visible sur la page des joueurs.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <p className="text-xs text-muted-foreground">Le prix Joma, logo du club compris.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="article-tailles">Tailles</Label>
            <Input id="article-tailles" value={tailles} onChange={(e) => setTailles(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">Séparées par des virgules, dans l&apos;ordre.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="flex flex-col gap-1.5">
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
        {Number.isFinite(nombreSaisi(prixCatalogue)) ? (
          <p className="rounded-md bg-secondary/50 px-3 py-2 text-sm">
            Prix joueur : <span className="font-semibold tabular-nums">{formaterPrix(prixJoueur(nombreSaisi(prixCatalogue), remiseSaisie, remiseGenerale))}</span>
            <span className="text-muted-foreground"> (remise de {tauxRemise(remiseSaisie, remiseGenerale).toLocaleString("fr-BE")} %)</span>
          </p>
        ) : null}
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Logo sur la face avant</span>
            <span className="block text-xs text-muted-foreground">Le logo du club sur la photo de face, à la place réglée pour cet article.</span>
          </span>
          <Switch
            checked={disposition.logoAvant}
            onCheckedChange={(logoAvant) => setDisposition((d) => ({ ...d, logoAvant }))}
            aria-label="Logo sur la face avant"
          />
        </label>
        {disposition.logoAvant ? <ReglageLogo variantes={variantes} disposition={disposition} onDisposition={setDisposition} /> : null}
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Floquable</span>
            <span className="block text-xs text-muted-foreground">Le joueur peut ajouter un numéro et un nom, avec supplément.</span>
          </span>
          <Switch checked={floquable} onCheckedChange={setFloquable} aria-label="Floquable" />
        </label>
        {floquable ? (
          <ReglageFlocage
            variantes={variantes}
            disposition={disposition}
            onDisposition={setDisposition}
            essaiNumero={essaiNumero}
            essaiNom={essaiNom}
            onEssaiNumero={setEssaiNumero}
            onEssaiNom={setEssaiNom}
          />
        ) : null}
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
            <p className="text-xs text-muted-foreground">Chacune avec son code couleur Joma et ses photos, la première étant la principale. Une seule couleur peut rester sans nom.</p>
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
                  <Label htmlFor={`code-${v.cle}`}>Code couleur Joma</Label>
                  <Input
                    id={`code-${v.cle}`}
                    value={v.codeCouleur}
                    onChange={(e) => changerVariante(v.cle, { codeCouleur: e.target.value })}
                    placeholder="339"
                    spellCheck={false}
                    className="h-10"
                  />
                  {referenceComplete(reference, v.codeCouleur) ? (
                    <p className="text-xs text-muted-foreground">
                      Chez Joma : <span className="font-mono">{referenceComplete(reference, v.codeCouleur)}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <PhotosCouleur
                  photos={v.photos}
                  nom={[nom, v.couleur].filter(Boolean).join(" ")}
                  onChange={(photos) => changerVariante(v.cle, { photos })}
                  photoDosId={v.photoDosId}
                  onDos={floquable ? (photoDosId) => changerVariante(v.cle, { photoDosId }) : undefined}
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
              {floquable ? (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Flocage :</span>
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
              {floquable || disposition.logoAvant ? (
                <label className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Logo :</span>
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
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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

  const ouvrir = (article: Article | null) => setOuverture((o) => ({ ouvert: true, article, cle: o.cle + 1 }));
  const fermer = () => setOuverture((o) => ({ ...o, ouvert: false }));
  const supprime = (id: number) => {
    setArticles((liste) => liste.filter((a) => a.id !== id));
    fermer();
  };
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
      )}

      <Sheet open={ouverture.ouvert} onOpenChange={(o) => !o && fermer()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
            <SheetTitle>{ouverture.article ? ouverture.article.nom : "Nouvel article"}</SheetTitle>
            <SheetDescription>Un article Joma du pack, avec ses couleurs et ses tailles.</SheetDescription>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>
    </Panneau>
  );
}
