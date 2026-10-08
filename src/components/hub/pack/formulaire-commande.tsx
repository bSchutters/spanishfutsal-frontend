"use client";

import { Check, Minus, Plus, Shirt, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { envoyerCommande, type CommandeEnvoyee } from "@/hub/actions/pack-joueurs";
import { avancementJoma, construireLignes, filtrerParTag, formaterPrix, MINIMUM_JOMA, prixUnitaire, tagsDuCatalogue, totalDes } from "@/hub/pack/calculs";
import { LONGUEUR_NOM_FLOCAGE, type Article, type LigneSaisie, type PrixFlocage } from "@/hub/pack/schema";
import { cn } from "@/lib/utils";
import ApercuFlocage, { ApercuLogo } from "./apercu-flocage";
import DiaporamaPhotos from "./diaporama-photos";
import { tanker } from "./police-tanker";

type Personne = { id: number; nom: string };
type LignePanier = LigneSaisie & { cle: string };

let compteur = 0;
const nouvelleCle = () => `p${++compteur}`;
const QUANTITE_MAX = 20;

/** Une couleur d'un article et ses photos ; une couleur sans photo montre celles de la premiere qui en a. */
function photosDe(article: Article, varianteId: string) {
  const variante = article.variantes.find((v) => v.id === varianteId) ?? article.variantes[0];
  const photos = variante?.photos.length ? variante.photos : (article.variantes.find((v) => v.photos.length > 0)?.photos ?? []);
  return { variante, photos };
}

/** La remise d'un article en pourcentage arrondi, ou zero. */
const remiseDe = (article: Article) => (article.prix < article.prixCatalogue ? Math.round((1 - article.prix / article.prixCatalogue) * 100) : 0);

/** Un prix dans la police du flocage. */
function Prix({ euros, className }: { euros: number; className?: string }) {
  return <span className={cn(tanker.className, "tracking-wide tabular-nums", className)}>{formaterPrix(euros)}</span>;
}

/** Le numero d'une etape, rond comme un ecusson, dans la police des maillots. */
function NumeroEtape({ numero }: { numero: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        tanker.className,
        "flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-spanish-accent-2 pt-0.5 text-lg text-spanish-accent-2",
      )}
    >
      {numero}
    </span>
  );
}

/** Un choix parmi des pastilles : la couleur, la taille. Assez grandes pour le pouce. */
function Pastilles({
  libelle,
  options,
  valeur,
  onChange,
  carre = false,
}: {
  libelle: string;
  options: { valeur: string; libelle: string }[];
  valeur: string;
  onChange: (valeur: string) => void;
  carre?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={libelle} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const choisi = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={choisi}
            onClick={() => onChange(o.valeur)}
            className={cn(
              "rounded-lg border-2 px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              carre ? "h-11 min-w-12" : "h-10",
              choisi
                ? "border-primary bg-primary text-primary-foreground"
                : "border-spanish-bg-lighter bg-spanish-bg-light text-foreground hover:border-primary/60",
            )}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}

/** Une quantite, de 1 a 20, avec deux boutons plutot qu'un champ a taper. */
function Quantite({ valeur, onChange, libelle, petit = false }: { valeur: number; onChange: (n: number) => void; libelle: string; petit?: boolean }) {
  const bouton = cn(
    "flex items-center justify-center rounded-md transition-colors hover:bg-spanish-bg-lighter focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-35 disabled:hover:bg-transparent",
    petit ? "size-7" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={libelle}
      className={cn("inline-flex shrink-0 items-center rounded-lg border-2 border-spanish-bg-lighter bg-spanish-bg-light", petit ? "" : "p-0.5")}
    >
      <button type="button" className={bouton} aria-label="Une pièce de moins" disabled={valeur <= 1} onClick={() => onChange(valeur - 1)}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className={cn("min-w-8 text-center font-semibold tabular-nums", petit ? "text-sm" : "text-base")}>{valeur}</span>
      <button
        type="button"
        className={bouton}
        aria-label="Une pièce de plus"
        disabled={valeur >= QUANTITE_MAX}
        onClick={() => onChange(valeur + 1)}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Un article du catalogue : ses photos en diaporama (on les fait defiler sans
 * ouvrir l'article), son nom et son prix. Toucher la photo, ou le nom et le
 * prix, ouvre sa fiche.
 */
function CarteProduit({ article, rang, dansPanier, onOuvrir }: { article: Article; rang: number; dansPanier: number; onOuvrir: () => void }) {
  const { variante, photos } = photosDe(article, article.variantes[0]?.id ?? "");
  const remise = remiseDe(article);
  const couleurs = article.variantes.map((v) => v.couleur).filter(Boolean);
  // Comme dans la fiche : le logo sur la face avant, les sponsors sur le dos.
  const indexDos = variante?.photoDosId ? photos.findIndex((p) => p.id === variante.photoDosId) : -1;
  const calques = [
    article.dispositionFlocage.logoAvant && photos.length > 0 && indexDos !== 0
      ? { index: 0, contenu: <ApercuLogo disposition={article.dispositionFlocage} logo={variante?.logo ?? "club"} /> }
      : null,
    article.floquable && indexDos >= 0 && variante
      ? {
          index: indexDos,
          contenu: (
            <ApercuFlocage numero="" nom="" couleurs={variante.couleursFlocage} disposition={article.dispositionFlocage} logo={variante.logo} />
          ),
        }
      : null,
  ].filter((c) => c !== null);

  return (
    <li
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-[border-color,translate] duration-300 hover:border-primary/50 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(rang, 8) * 60}ms`, animationDuration: "500ms", animationFillMode: "both" }}
    >
      <div className="relative">
        <DiaporamaPhotos photos={photos} legende={[article.nom, variante?.couleur].filter(Boolean).join(" ")} calques={calques} onPhoto={onOuvrir} compact />
        {remise > 0 ? (
          <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-spanish-accent-2 px-2 py-0.5 text-[11px] font-bold text-spanish-bg-dark">
            −{remise} %
          </span>
        ) : null}
        {dansPanier > 0 ? (
          <span className="pointer-events-none absolute end-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
            {dansPanier}
            <span className="sr-only"> dans votre commande</span>
          </span>
        ) : null}
      </div>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOuvrir}
        className="flex flex-1 flex-col text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="text-sm leading-snug font-semibold sm:text-base">{article.nom}</span>
          {couleurs.length > 0 ? (
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {couleurs.length > 1 ? `${couleurs.length} couleurs · ${couleurs.join(", ")}` : couleurs[0]}
            </span>
          ) : null}
          <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
            <Prix euros={article.prix} className="text-xl text-spanish-accent-2 sm:text-2xl" />
            {remise > 0 ? <span className="text-xs text-muted-foreground tabular-nums line-through">{formaterPrix(article.prixCatalogue)}</span> : null}
          </span>
          {article.floquable ? <span className="text-[11px] text-muted-foreground">Numéro et nom au dos en option</span> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * La commande groupee chez Joma, qui demande 150 euros au minimum : ce que
 * les autres ont deja commande, en or plein, puis ce que la commande en cours
 * y ajouterait, en or plus clair. Un total, jamais qui a commande quoi.
 */
function CommandeGroupee({ montant, panier }: { montant: number; panier: number }) {
  const avec = montant + panier;
  const { atteint, reste } = avancementJoma(avec);
  const deja = avancementJoma(montant).part;
  const ensemble = avancementJoma(avec).part;
  return (
    <section aria-labelledby="commande-groupee" className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="commande-groupee" className="text-sm font-semibold">
          Commande groupée chez Joma
        </h2>
        <p className="text-sm tabular-nums">
          <Prix euros={avec} className="text-lg text-spanish-accent-2" />
          <span className="text-muted-foreground"> sur {formaterPrix(MINIMUM_JOMA)}</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Montant de la commande groupée"
        aria-valuemin={0}
        aria-valuemax={MINIMUM_JOMA}
        aria-valuenow={Math.min(avec, MINIMUM_JOMA)}
        aria-valuetext={`${formaterPrix(avec)} sur ${formaterPrix(MINIMUM_JOMA)}`}
        className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-spanish-accent-2/45 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${ensemble * 100}%` }}
        />
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-spanish-accent-2 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${deja * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {panier > 0 ? `Avec votre commande : ${formaterPrix(avec)}. ` : ""}
        {atteint
          ? "Le minimum de 150 € est atteint : le club peut passer la commande chez Joma."
          : `Joma demande ${formaterPrix(MINIMUM_JOMA)} au minimum : encore ${formaterPrix(reste)} avant que le club puisse passer la commande.`}
      </p>
    </section>
  );
}

/** Un reglage de la fiche d'un article : son libelle, puis son choix. */
function Champ({ libelle, detail, children }: { libelle: string; detail?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium">
        {libelle}
        {detail ? <span className="ms-2 font-normal text-muted-foreground">{detail}</span> : null}
      </p>
      {children}
    </div>
  );
}

/**
 * La fiche d'un article, dans une fenetre : les photos en grand, avec le logo
 * du club et l'apercu du flocage, puis la couleur, la taille, la quantite et
 * le flocage. Le prix de la ligne suit, sur le bouton du bas.
 */
function FicheProduit({
  article,
  flocage,
  onAjouter,
  onFermer,
}: {
  article: Article;
  flocage: PrixFlocage;
  onAjouter: (ligne: LignePanier) => void;
  onFermer: () => void;
}) {
  const [varianteId, setVarianteId] = useState(article.variantes[0]?.id ?? "");
  const [taille, setTaille] = useState(article.tailles.length === 1 ? article.tailles[0] : "");
  const [quantite, setQuantite] = useState(1);
  const [avecFlocage, setAvecFlocage] = useState(false);
  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");

  const { variante, photos } = photosDe(article, varianteId);
  const remise = remiseDe(article);
  // La photo de dos de la couleur choisie, si elle en a une parmi les photos montrees.
  const indexDos = variante?.photoDosId ? photos.findIndex((p) => p.id === variante.photoDosId) : -1;
  // Les sponsors du club y sont toujours ; le numero et le nom, une fois le flocage demande.
  const apercu =
    article.floquable && indexDos >= 0 && variante
      ? {
          index: indexDos,
          contenu: (
            <ApercuFlocage
              numero={avecFlocage ? numero : ""}
              nom={avecFlocage ? nom.trim() : ""}
              couleurs={variante.couleursFlocage}
              disposition={article.dispositionFlocage}
              logo={variante.logo}
            />
          ),
        }
      : null;
  // Le logo du club sur la photo principale, la face avant, si l'article le prevoit.
  const logo =
    article.dispositionFlocage.logoAvant && photos.length > 0 && indexDos !== 0
      ? { index: 0, contenu: <ApercuLogo disposition={article.dispositionFlocage} logo={variante?.logo ?? "club"} /> }
      : null;

  const numeroValide = numero === "" || /^\d{1,2}$/.test(numero);
  const flocageIncomplet = avecFlocage && numero === "" && nom.trim() === "";
  const unitaire = prixUnitaire(article.prix, flocage, avecFlocage ? numero : "", avecFlocage ? nom.trim() : "");
  const total = totalDes([{ prixUnitaire: unitaire, quantite }]);
  const sansTaille = article.tailles.length === 0;
  const manque = !sansTaille && !taille ? "Choisissez une taille" : flocageIncomplet ? "Indiquez un numéro ou un nom" : !numeroValide ? "Deux chiffres au plus" : null;

  const blocFlocage = useRef<HTMLDivElement>(null);

  const basculerFlocage = (actif: boolean) => {
    setAvecFlocage(actif);
    if (actif) requestAnimationFrame(() => blocFlocage.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const ajouter = () => {
    if (manque) return;
    onAjouter({
      cle: nouvelleCle(),
      id: null,
      articleId: article.id,
      varianteId,
      taille,
      quantite,
      numero: avecFlocage ? numero : "",
      nom: avecFlocage ? nom.trim() : "",
    });
  };

  return (
    // Sur grand ecran, la photo occupe un carre exact a la hauteur de la fenetre, et les reglages defilent a cote.
    <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="relative shrink-0 bg-white lg:aspect-square lg:h-full">
        <div className="mx-auto w-full max-w-[44dvh] lg:max-w-none">
          {/* La cle remet le diaporama sur la photo principale a chaque changement de couleur. */}
          <DiaporamaPhotos
            key={variante?.id}
            photos={photos}
            legende={[article.nom, variante?.couleur].filter(Boolean).join(" ")}
            allerA={avecFlocage && indexDos >= 0 ? indexDos : null}
            calques={[logo, apercu].filter((c) => c !== null)}
          />
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 sm:px-7 sm:pt-6 [scrollbar-color:var(--spanish-bg-lighter)_transparent] [scrollbar-width:thin]">
          <DialogTitle className="text-xl leading-tight font-semibold sm:text-2xl lg:pe-10">{article.nom}</DialogTitle>
          {article.description ? <DialogDescription className="mt-1.5 text-sm">{article.description}</DialogDescription> : null}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Prix euros={article.prix} className="text-3xl text-spanish-accent-2" />
            {remise > 0 ? (
              <>
                <span className="text-sm text-muted-foreground tabular-nums line-through">{formaterPrix(article.prixCatalogue)}</span>
                <span className="rounded-full bg-spanish-accent-2/15 px-2 py-0.5 text-xs font-semibold text-spanish-accent-2">Remise club −{remise} %</span>
              </>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {article.variantes.length > 1 ? (
              <Champ libelle="Couleur" detail={variante?.couleur}>
                <Pastilles
                  libelle="Couleur"
                  options={article.variantes.map((v) => ({ valeur: v.id, libelle: v.couleur || "Couleur unique" }))}
                  valeur={varianteId}
                  onChange={setVarianteId}
                />
              </Champ>
            ) : null}
            {sansTaille ? null : (
              <Champ libelle="Taille">
                <Pastilles libelle="Taille" options={article.tailles.map((t) => ({ valeur: t, libelle: t }))} valeur={taille} onChange={setTaille} carre />
              </Champ>
            )}
            {article.floquable ? (
              <div ref={blocFlocage} className="scroll-mb-4 rounded-xl border border-border bg-background/40 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">Flocage au dos</span>
                    <span className="block text-xs text-muted-foreground">
                      Numéro +{formaterPrix(flocage.numero)}, nom +{formaterPrix(flocage.nom)} par pièce.
                    </span>
                  </span>
                  <Switch checked={avecFlocage} onCheckedChange={basculerFlocage} aria-label="Flocage au dos" />
                </label>
                {avecFlocage ? (
                  <div className="mt-4 flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in-0">
                    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="flocage-numero" className="text-xs text-muted-foreground">
                          Numéro
                        </Label>
                        <Input
                          id="flocage-numero"
                          inputMode="numeric"
                          placeholder="10"
                          maxLength={2}
                          value={numero}
                          onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                          className={cn(tanker.className, "h-12 text-center text-2xl md:text-2xl")}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="flocage-nom" className="text-xs text-muted-foreground">
                          Nom
                        </Label>
                        <Input
                          id="flocage-nom"
                          placeholder="NOM"
                          maxLength={LONGUEUR_NOM_FLOCAGE}
                          value={nom}
                          onChange={(e) => setNom(e.target.value.toUpperCase())}
                          className={cn(tanker.className, "h-12 text-xl tracking-wide md:text-xl")}
                        />
                      </div>
                    </div>
                    {indexDos >= 0 ? <p className="text-xs text-muted-foreground">L&apos;aperçu sur la photo de dos est indicatif.</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-7">
          {/* La quantite et l'ajout, toujours a portee : le prix de la ligne est sur le bouton. */}
          <div className="flex items-center gap-3">
            <Quantite valeur={quantite} onChange={setQuantite} libelle="Quantité" />
            <Button
              type="button"
              variant="hub"
              className="h-12 min-w-0 flex-1 justify-between gap-3 px-4 text-base"
              disabled={manque !== null}
              onClick={ajouter}
            >
              {manque ? (
                <span className="mx-auto truncate">{manque}</span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Plus aria-hidden="true" />
                    Ajouter
                  </span>
                  <Prix euros={total} className="text-xl" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* La croix ferme toute la fenetre : en haut a droite, sur la photo au telephone, sur le fond marine a l'ordinateur. */}
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-primary lg:bg-transparent lg:text-muted-foreground lg:hover:bg-spanish-bg-lighter lg:hover:text-foreground"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** La commande partie : son numero, son recapitulatif, et ce qui se passe ensuite. */
function Confirmation({ commande, onNouvelle }: { commande: CommandeEnvoyee; onNouvelle: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-7 py-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-spanish-accent-2 text-spanish-bg-dark">
          <Check className="size-8" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 className={cn(tanker.className, "text-4xl leading-none uppercase sm:text-5xl")}>Commande envoyée</h2>
        <p className="text-muted-foreground">
          Merci {commande.personne} ! Le club a bien reçu votre commande n° {commande.numero}.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {commande.lignes.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{l.article}</span>
                <span className="block text-xs text-muted-foreground">
                  {[l.couleur, l.taille ? `Taille ${l.taille}` : "", l.numero ? `N° ${l.numero}` : "", l.nom].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-end tabular-nums">
                {l.quantite} × {formaterPrix(l.prixUnitaire)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
          <span className="text-sm font-medium">Total</span>
          <Prix euros={commande.total} className="text-2xl text-spanish-accent-2" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Et maintenant ?</p>
        <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <NumeroEtape numero={1} />
            <span className="pt-2">
              Le club vous contacte pour le virement, avec en communication « Pack n° {commande.numero} » : rien n&apos;est payé en ligne.
            </span>
          </li>
          <li className="flex gap-3">
            <NumeroEtape numero={2} />
            <span className="pt-2">Une erreur ? Prévenez le club : il corrige la commande de son côté.</span>
          </li>
        </ol>
      </div>
      <Button type="button" variant="hubSecondary" className="h-11 self-center px-6" onClick={onNouvelle}>
        Passer une autre commande
      </Button>
    </section>
  );
}

/**
 * La page de commande des joueurs, en trois etapes : qui commande, les
 * articles, puis la commande et l'envoi. Rien n'est paye ici : la commande
 * arrive dans le Hub, et le club recontacte la personne pour le virement.
 */
export default function FormulaireCommande({
  jeton,
  articles,
  effectif,
  flocage,
  montantGroupe,
}: {
  jeton: string;
  articles: Article[];
  effectif: Personne[];
  flocage: PrixFlocage;
  /** Le montant des commandes recues, qui attendent la commande groupee chez Joma. */
  montantGroupe: number;
}) {
  const [personne, setPersonne] = useState("");
  // Les commandes envoyees depuis cette page s'ajoutent au montant charge avec elle.
  const [montantEnvoye, setMontantEnvoye] = useState(0);
  const [remarque, setRemarque] = useState("");
  const [panier, setPanier] = useState<LignePanier[]>([]);
  // L'article ouvert reste affiche pendant que sa fenetre se ferme ; la cle remet sa fiche a zero.
  const [fiche, setFiche] = useState<{ ouvert: boolean; article: Article | null; cle: number }>({ ouvert: false, article: null, cle: 0 });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState<CommandeEnvoyee | null>(null);
  const [panierVisible, setPanierVisible] = useState(false);
  // Le tag choisi pour filtrer les articles, ou aucun : tous.
  const [filtre, setFiltre] = useState<string | null>(null);
  const zonePanier = useRef<HTMLElement>(null);

  const apercu = useMemo(() => construireLignes(panier, articles, flocage, { inactifsAdmis: false }), [panier, articles, flocage]);
  const pieces = panier.reduce((n, l) => n + l.quantite, 0);
  const tags = useMemo(() => tagsDuCatalogue(articles), [articles]);
  const visibles = filtrerParTag(articles, filtre);

  // Sur telephone, la barre du bas mene a la commande tant qu'elle n'est pas a l'ecran.
  useEffect(() => {
    const zone = zonePanier.current;
    if (!zone) return;
    const observateur = new IntersectionObserver(([entree]) => setPanierVisible(entree.isIntersecting), { threshold: 0.1 });
    observateur.observe(zone);
    return () => observateur.disconnect();
  }, [envoyee]);

  const ouvrir = (article: Article) => setFiche((f) => ({ ouvert: true, article, cle: f.cle + 1 }));
  const fermer = () => setFiche((f) => ({ ...f, ouvert: false }));

  const ajouter = (ligne: LignePanier) => {
    // La meme piece, meme couleur, meme taille et meme flocage, s'ajoute a sa ligne, vingt pieces au plus.
    const meme = panier.find(
      (l) => l.articleId === ligne.articleId && l.varianteId === ligne.varianteId && l.taille === ligne.taille && l.numero === ligne.numero && l.nom === ligne.nom,
    );
    const ajoutees = meme ? Math.min(QUANTITE_MAX, meme.quantite + ligne.quantite) - meme.quantite : ligne.quantite;
    const article = articles.find((a) => a.id === ligne.articleId);
    if (ajoutees <= 0) {
      toast.error(`Vous avez déjà ${QUANTITE_MAX} pièces de cet article dans votre commande, le maximum.`);
      return;
    }
    setPanier((liste) => (meme ? liste.map((l) => (l.cle === meme.cle ? { ...l, quantite: l.quantite + ajoutees } : l)) : [...liste, ligne]));
    if (ajoutees < ligne.quantite) {
      toast.warning(`${QUANTITE_MAX} pièces au plus par article : ${ajoutees} ajoutée${ajoutees > 1 ? "s" : ""} sur ${ligne.quantite}.`);
    } else {
      toast.success(`${article?.nom ?? "Article"} ajouté à votre commande.`);
    }
    setErreur(null);
    fermer();
  };

  const changerQuantite = (cle: string, quantite: number) =>
    setPanier((liste) => liste.map((l) => (l.cle === cle ? { ...l, quantite: Math.min(QUANTITE_MAX, Math.max(1, quantite)) } : l)));

  const allerAuPanier = () => zonePanier.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!personne) {
      setErreur("Indiquez qui commande, en haut de votre commande.");
      const champ = document.getElementById("pack-qui");
      champ?.scrollIntoView({ behavior: "smooth", block: "center" });
      champ?.focus({ preventScroll: true });
      return;
    }
    setEnCours(true);
    const r = await envoyerCommande(jeton, {
      joueurId: Number(personne),
      autreNom: "",
      telephone: "",
      email: "",
      remarque,
      lignes: panier.map((l) => ({ id: l.id, articleId: l.articleId, varianteId: l.varianteId, taille: l.taille, quantite: l.quantite, numero: l.numero, nom: l.nom })),
    }).catch(() => ({ ok: false as const, erreur: "La commande n'est pas partie. Vérifiez votre connexion et réessayez." }));
    setEnCours(false);
    if (!r.ok || !r.donnees) {
      setErreur(r.ok ? "La commande est partie, mais la confirmation n'a pas suivi." : r.erreur);
      return;
    }
    const commande = r.donnees;
    setEnvoyee(commande);
    setMontantEnvoye((m) => m + commande.total);
    window.scrollTo({ top: 0 });
  };

  if (envoyee) {
    return (
      <Confirmation
        commande={envoyee}
        onNouvelle={() => {
          setEnvoyee(null);
          setPanier([]);
          setRemarque("");
        }}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]",
          // De la place sous la page pour la barre du bas, sur telephone.
          panier.length > 0 && "max-lg:pb-20",
        )}
      >
        <section className="flex min-w-0 flex-col gap-5" aria-labelledby="pack-articles">
          <div>
            <h2 id="pack-articles" className="text-lg leading-tight font-semibold">
              Les articles
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Touchez un article pour choisir sa couleur, sa taille et son flocage.</p>
          </div>
          {tags.length > 0 ? (
            // Une rangee qui defile au doigt sur telephone, et passe a la ligne sur grand ecran.
            <div
              role="group"
              aria-label="Filtrer les articles"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {[null, ...tags].map((tag) => {
                const actif = (tag ?? "") === (filtre ?? "");
                const nombre = filtrerParTag(articles, tag).length;
                return (
                  <button
                    key={tag ?? "tout"}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFiltre(tag)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      actif
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-spanish-bg-lighter bg-spanish-bg-light text-foreground hover:border-primary/60",
                    )}
                  >
                    {tag ?? "Tout"}
                    <span className={cn("text-xs tabular-nums", actif ? "text-primary-foreground/70" : "text-muted-foreground")}>{nombre}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {articles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">Aucun article pour le moment.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {visibles.map((a, rang) => (
                <CarteProduit
                  key={a.id}
                  article={a}
                  rang={rang}
                  dansPanier={panier.filter((l) => l.articleId === a.id).reduce((n, l) => n + l.quantite, 0)}
                  onOuvrir={() => ouvrir(a)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* La colonne de droite reste en place : la commande groupee, puis ma commande, qui retrecit et fait defiler ses lignes si la place manque. */}
        <aside
          ref={zonePanier}
          id="ma-commande"
          aria-labelledby="pack-commande"
          className="flex scroll-mt-4 flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]"
        >
          <div className="shrink-0">
            <CommandeGroupee montant={montantGroupe + montantEnvoye} panier={apercu.ok ? apercu.total : 0} />
          </div>
          <form onSubmit={envoyer} className="flex flex-col rounded-2xl border border-border bg-card lg:min-h-0">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <ShoppingBag className="size-5 text-spanish-accent-2" aria-hidden="true" />
              <h2 id="pack-commande" className="text-lg font-semibold">
                Ma commande
              </h2>
              {pieces > 0 ? (
                <span className="ms-auto text-sm text-muted-foreground tabular-nums">
                  {pieces} {pieces > 1 ? "pièces" : "pièce"}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-4">
              <Label htmlFor="pack-qui" className="text-sm">
                Qui commande ?
              </Label>
              <Select
                value={personne}
                onValueChange={(v) => {
                  setPersonne(v);
                  setErreur(null);
                }}
              >
                <SelectTrigger id="pack-qui" className="w-full data-[size=default]:h-11">
                  <SelectValue placeholder="Choisissez votre nom…" />
                </SelectTrigger>
                <SelectContent>
                  {effectif.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Votre nom dans l&apos;effectif. Pour vos proches, commandez à votre nom.</p>
            </div>

            {panier.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
                <ShoppingBag className="size-8" aria-hidden="true" />
                <p>Votre commande est vide. Touchez un article pour l&apos;ajouter.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border px-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto [scrollbar-color:var(--spanish-bg-lighter)_transparent] [scrollbar-width:thin]">
                {panier.map((l, i) => {
                  const ligne = apercu.ok ? apercu.lignes[i] : null;
                  const article = articles.find((a) => a.id === l.articleId);
                  const photo = article ? photosDe(article, l.varianteId ?? "").photos[0] : undefined;
                  return (
                    <li key={l.cle} className="flex gap-3 py-4">
                      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="size-full object-contain" />
                        ) : (
                          <Shirt className="size-6 text-slate-400" aria-hidden="true" />
                        )}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-snug font-medium">{ligne?.article ?? article?.nom ?? "Article indisponible"}</p>
                          <button
                            type="button"
                            aria-label={`Retirer ${ligne?.article ?? "cette ligne"}`}
                            onClick={() => setPanier((liste) => liste.filter((x) => x.cle !== l.cle))}
                            className="-me-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-spanish-bg-lighter hover:text-foreground"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{[ligne?.couleur, l.taille ? `Taille ${l.taille}` : ""].filter(Boolean).join(" · ")}</p>
                        {l.numero || l.nom ? (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Flocage </span>
                            <span className={cn(tanker.className, "tracking-wide text-spanish-accent-2")}>{[l.numero, l.nom].filter(Boolean).join(" ")}</span>
                          </p>
                        ) : null}
                        <div className="mt-1.5 flex items-center justify-between gap-3">
                          <Quantite valeur={l.quantite} onChange={(n) => changerQuantite(l.cle, n)} libelle={`Quantité, ${ligne?.article ?? "article"}`} petit />
                          <span className="text-sm font-semibold tabular-nums">
                            {ligne ? formaterPrix(totalDes([{ prixUnitaire: ligne.prixUnitaire, quantite: l.quantite }])) : "?"}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {panier.length > 0 ? (
              <div className="flex shrink-0 flex-col gap-4 border-t border-border px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Total</span>
                  {apercu.ok ? <Prix euros={apercu.total} className="text-3xl text-spanish-accent-2" /> : <span className="text-sm text-destructive">{apercu.erreur}</span>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pack-remarque" className="text-sm">
                    Remarque <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <Textarea
                    id="pack-remarque"
                    value={remarque}
                    onChange={(e) => setRemarque(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Une précision pour le club"
                  />
                </div>
                {erreur ? (
                  <p role="alert" className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
                    {erreur}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  <Button type="submit" variant="hub" className="h-12 text-base" disabled={enCours || !apercu.ok}>
                    {enCours ? "Envoi…" : "Envoyer ma commande"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Pas de paiement en ligne : le club vous contactera pour le virement.</p>
                </div>
              </div>
            ) : null}
          </form>
        </aside>
      </div>

      {/* Sur telephone, la commande en cours reste a portee de pouce. */}
      {panier.length > 0 && !panierVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md motion-safe:animate-in motion-safe:slide-in-from-bottom-4 lg:hidden">
          <button
            type="button"
            onClick={allerAuPanier}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden="true" />
              Ma commande · {pieces} {pieces > 1 ? "pièces" : "pièce"}
            </span>
            {apercu.ok ? <Prix euros={apercu.total} className="text-xl" /> : null}
          </button>
        </div>
      ) : null}

      <Dialog open={fiche.ouvert} onOpenChange={(o) => !o && fermer()}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="flex h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[min(42rem,calc(100dvh-4rem))] sm:max-w-[min(68rem,calc(100%-3rem))]"
        >
          {fiche.article ? (
            <FicheProduit key={fiche.cle} article={fiche.article} flocage={flocage} onAjouter={ajouter} onFermer={fermer} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
