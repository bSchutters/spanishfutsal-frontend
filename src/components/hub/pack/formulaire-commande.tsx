"use client";

import { Check, Plus, Shirt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { envoyerCommande, type CommandeEnvoyee } from "@/hub/actions/pack-joueurs";
import { construireLignes, formaterPrix, resumeLigne } from "@/hub/pack/calculs";
import { LONGUEUR_NOM_FLOCAGE, type Article, type LigneSaisie, type Photo, type PrixFlocage } from "@/hub/pack/schema";
import { cn } from "@/lib/utils";
import ListeDeroulante from "./liste-deroulante";

type Personne = { id: number; nom: string };
type LignePanier = LigneSaisie & { cle: string };

let compteur = 0;
const nouvelleCle = () => `p${++compteur}`;
const AUTRE = "autre";

/** Les photos d'une couleur : la grande, et les vignettes pour passer de l'une a l'autre. */
function Galerie({ photos, legende }: { photos: Photo[]; legende: string }) {
  const [vue, setVue] = useState(0);
  const affichee = photos[Math.min(vue, photos.length - 1)];
  return (
    <div className="flex flex-col bg-white/5">
      <div className="flex aspect-[4/3] items-center justify-center">
        {affichee ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affichee.url} alt={legende} className="size-full object-contain" />
        ) : (
          <Shirt className="size-10 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      {photos.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2">
          {photos.map((p, rang) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Photo ${rang + 1} sur ${photos.length}`}
              aria-pressed={rang === vue}
              onClick={() => setVue(rang)}
              className={cn(
                "size-12 shrink-0 overflow-hidden rounded-md border-2 bg-white/5 transition-colors",
                rang === vue ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Une carte du catalogue : couleur, taille, quantite et flocage, puis « Ajouter ». */
function CarteArticle({ article, flocage, onAjouter }: { article: Article; flocage: PrixFlocage; onAjouter: (ligne: LignePanier) => void }) {
  const [varianteId, setVarianteId] = useState(article.variantes[0]?.id ?? "");
  const [taille, setTaille] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [avecFlocage, setAvecFlocage] = useState(false);
  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");
  const [ajoute, setAjoute] = useState(false);

  const variante = article.variantes.find((v) => v.id === varianteId) ?? article.variantes[0];
  // Une couleur sans photo montre celles de la premiere couleur qui en a.
  const photos = variante?.photos.length ? variante.photos : (article.variantes.find((v) => v.photos.length > 0)?.photos ?? []);
  const numeroValide = numero === "" || /^\d{1,2}$/.test(numero);
  const flocageIncomplet = avecFlocage && numero === "" && nom.trim() === "";

  const ajouter = () => {
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
    setQuantite(1);
    setNumero("");
    setNom("");
    setAjoute(true);
    setTimeout(() => setAjoute(false), 1500);
  };

  const libelleBouton = ajoute
    ? "Ajouté"
    : !taille
      ? "Choisissez une taille"
      : flocageIncomplet
        ? "Indiquez un numéro ou un nom"
        : "Ajouter à ma commande";

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* La cle remet la galerie sur la photo principale a chaque changement de couleur. */}
      <Galerie key={variante?.id} photos={photos} legende={[article.nom, variante?.couleur].filter(Boolean).join(" ")} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold">{article.nom}</h3>
            <span className="shrink-0 text-right tabular-nums">
              {article.prix < article.prixCatalogue ? (
                <span className="mr-1.5 text-xs text-muted-foreground line-through">{formaterPrix(article.prixCatalogue)}</span>
              ) : null}
              <span className="text-sm font-semibold">{formaterPrix(article.prix)}</span>
            </span>
          </div>
          {article.description ? <p className="mt-1 text-xs text-muted-foreground">{article.description}</p> : null}
        </div>

        {article.variantes.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Couleur">
            {article.variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === varianteId}
                onClick={() => setVarianteId(v.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  v.id === varianteId ? "border-primary bg-secondary font-medium" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {v.couleur}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <ListeDeroulante aria-label={`Taille, ${article.nom}`} value={taille} onChange={(e) => setTaille(e.target.value)} className="h-10">
            <option value="">Taille…</option>
            {article.tailles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </ListeDeroulante>
          <Input
            aria-label={`Quantité, ${article.nom}`}
            type="number"
            min={1}
            max={20}
            value={quantite}
            onChange={(e) => setQuantite(Math.min(20, Math.max(1, Math.trunc(Number(e.target.value) || 1))))}
            className="h-10"
          />
        </div>

        {article.floquable ? (
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium">Flocage</span>
                <span className="block text-xs text-muted-foreground">
                  Numéro +{formaterPrix(flocage.numero)}, nom +{formaterPrix(flocage.nom)} par pièce.
                </span>
              </span>
              <Switch checked={avecFlocage} onCheckedChange={setAvecFlocage} aria-label={`Flocage, ${article.nom}`} />
            </label>
            {avecFlocage ? (
              <div className="grid grid-cols-[5rem_1fr] gap-2">
                <Input
                  aria-label={`Numéro à floquer, ${article.nom}`}
                  inputMode="numeric"
                  placeholder="N°"
                  maxLength={2}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                  className="h-10"
                />
                <Input
                  aria-label={`Nom à floquer, ${article.nom}`}
                  placeholder="Nom au dos"
                  maxLength={LONGUEUR_NOM_FLOCAGE}
                  value={nom}
                  onChange={(e) => setNom(e.target.value.toUpperCase())}
                  className="h-10"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          variant="hubSecondary"
          className="mt-auto h-10"
          disabled={!taille || !numeroValide || flocageIncomplet}
          onClick={ajouter}
        >
          {ajoute ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {libelleBouton}
        </Button>
      </div>
    </li>
  );
}

/**
 * La page de commande des joueurs : qui commande, les articles, les
 * coordonnees, puis l'envoi. Rien n'est paye ici : la commande arrive dans
 * le Hub, et le club recontacte la personne pour le virement.
 */
export default function FormulaireCommande({
  jeton,
  articles,
  effectif,
  flocage,
}: {
  jeton: string;
  articles: Article[];
  effectif: Personne[];
  flocage: PrixFlocage;
}) {
  const [personne, setPersonne] = useState("");
  const [autreNom, setAutreNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [remarque, setRemarque] = useState("");
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState<CommandeEnvoyee | null>(null);

  const apercu = useMemo(() => construireLignes(panier, articles, flocage, { inactifsAdmis: false }), [panier, articles, flocage]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const r = await envoyerCommande(jeton, {
      joueurId: personne && personne !== AUTRE ? Number(personne) : null,
      autreNom: personne === AUTRE ? autreNom : "",
      telephone,
      email,
      remarque,
      lignes: panier.map((l) => ({ id: l.id, articleId: l.articleId, varianteId: l.varianteId, taille: l.taille, quantite: l.quantite, numero: l.numero, nom: l.nom })),
    }).catch(() => ({ ok: false as const, erreur: "La commande n'est pas partie. Vérifiez votre connexion et réessayez." }));
    setEnCours(false);
    if (!r.ok || !r.donnees) {
      setErreur(r.ok ? "La commande est partie, mais la confirmation n'a pas suivi." : r.erreur);
      return;
    }
    setEnvoyee(r.donnees);
    window.scrollTo({ top: 0 });
  };

  if (envoyee) {
    return (
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Commande envoyée</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Merci {envoyee.personne}. Le club a reçu votre commande n° {envoyee.numero} et vous contactera pour le virement.
          </p>
        </div>
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {envoyee.lignes.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-3 py-2">
              <span className="min-w-0">{resumeLigne(l)}</span>
              <span className="shrink-0 tabular-nums">
                {l.quantite} × {formaterPrix(l.prixUnitaire)}
              </span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formaterPrix(envoyee.total)}</span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">Une erreur ? Prévenez le club : la commande se corrige de son côté.</p>
        <Button
          type="button"
          variant="hubSecondary"
          className="h-10"
          onClick={() => {
            setEnvoyee(null);
            setPanier([]);
            setRemarque("");
          }}
        >
          Passer une autre commande
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Qui commande ?</h2>
        <ListeDeroulante aria-label="Votre nom" value={personne} onChange={(e) => setPersonne(e.target.value)} className="h-10" required>
          <option value="">Choisissez votre nom…</option>
          {effectif.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
          <option value={AUTRE}>Autre (parent, proche…)</option>
        </ListeDeroulante>
        {personne === AUTRE ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-autre-nom">Votre nom</Label>
            <Input id="pack-autre-nom" value={autreNom} onChange={(e) => setAutreNom(e.target.value)} autoComplete="name" required className="h-10" />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Les articles</h2>
        {articles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun article pour le moment.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {articles.map((a) => (
              <CarteArticle key={a.id} article={a} flocage={flocage} onAjouter={(l) => setPanier((x) => [...x, l])} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Ma commande</h2>
        {panier.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien pour l&apos;instant : ajoutez un article ci-dessus.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {panier.map((l, i) => {
              const ligne = apercu.ok ? apercu.lignes[i] : null;
              return (
                <li key={l.cle} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block">{ligne ? resumeLigne(ligne) : "Article indisponible"}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {l.quantite} × {ligne ? formaterPrix(ligne.prixUnitaire) : "?"}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="hubSecondary"
                    size="sm"
                    aria-label="Retirer cette ligne"
                    onClick={() => setPanier((x) => x.filter((y) => y.cle !== l.cle))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
            <li className="flex justify-between px-3 py-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{apercu.ok ? formaterPrix(apercu.total) : "?"}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-semibold">Vos coordonnées</h2>
          <p className="mt-1 text-xs text-muted-foreground">Un téléphone ou une adresse e-mail, pour vous contacter au sujet du virement.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-telephone">Téléphone</Label>
            <Input id="pack-telephone" type="tel" autoComplete="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-email">E-mail</Label>
            <Input id="pack-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pack-remarque">Remarque</Label>
          <Textarea id="pack-remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={2} maxLength={500} />
        </div>
      </section>

      {erreur ? (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button type="submit" variant="hub" className="h-11" disabled={enCours || panier.length === 0 || !apercu.ok}>
          {enCours ? "Envoi…" : apercu.ok && panier.length > 0 ? `Envoyer ma commande · ${formaterPrix(apercu.total)}` : "Envoyer ma commande"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Pas de paiement en ligne : le club vous contactera pour le virement.</p>
      </div>
    </form>
  );
}
