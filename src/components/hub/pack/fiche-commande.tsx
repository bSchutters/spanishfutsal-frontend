"use client";

import { Ban, Mail, Phone, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerCommande, supprimerCommande } from "@/hub/actions/pack";
import { formaterDateCourte, formaterHeure } from "@/hub/dates";
import { construireLignes, formaterPrix, resumeLigne } from "@/hub/pack/calculs";
import {
  LIBELLES_STATUT_COMMANDE,
  STATUTS_COMMANDE,
  type Article,
  type Commande,
  type LigneSaisie,
  type PrixFlocage,
  type StatutCommande,
} from "@/hub/pack/schema";

type LigneEdition = LigneSaisie & { cle: string };

let compteur = 0;
const nouvelleCle = () => `l${++compteur}`;

/**
 * Une commande ouverte dans le Hub. En lecture, elle se lit ; en edition,
 * le club corrige les lignes a la demande du joueur, ses coordonnees et le
 * statut. Le total se recalcule avec les memes regles que le serveur.
 */
export default function FicheCommande({
  commande,
  catalogue,
  flocage,
  peutEditer,
  onFermer,
  onEnregistree,
  onSupprimee,
}: {
  commande: Commande;
  catalogue: Article[];
  flocage: PrixFlocage;
  peutEditer: boolean;
  onFermer: () => void;
  onEnregistree: (commande: Commande) => void;
  onSupprimee: (id: number) => void;
}) {
  const [statut, setStatut] = useState<StatutCommande>(commande.statut);
  const [telephone, setTelephone] = useState(commande.telephone);
  const [email, setEmail] = useState(commande.email);
  const [remarque, setRemarque] = useState(commande.remarque);
  const [lignes, setLignes] = useState<LigneEdition[]>(() =>
    commande.lignes.map((l) => ({
      cle: nouvelleCle(),
      id: l.id,
      articleId: l.articleId,
      varianteId: l.varianteId ?? "",
      taille: l.taille,
      quantite: l.quantite,
      numero: l.numero,
      nom: l.nom,
    })),
  );
  const [ajout, setAjout] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  const apercu = useMemo(
    () => construireLignes(lignes, catalogue, flocage, { inactifsAdmis: true, anciennes: commande.lignes }),
    [lignes, catalogue, flocage, commande.lignes],
  );

  const changer = (cle: string, partiel: Partial<LigneEdition>) =>
    setLignes((liste) => liste.map((l) => (l.cle === cle ? { ...l, ...partiel } : l)));

  const ajouterArticle = (id: number) => {
    const article = catalogue.find((a) => a.id === id);
    if (!article) return;
    setLignes((liste) => [
      ...liste,
      {
        cle: nouvelleCle(),
        id: null,
        articleId: article.id,
        varianteId: article.variantes[0]?.id ?? "",
        taille: article.tailles[0] ?? "",
        quantite: 1,
        numero: "",
        nom: "",
      },
    ]);
    setAjout("");
  };

  // Annuler ou retablir enregistre aussitot, avec ce que la fiche montre.
  const enregistrer = async (nouveauStatut: StatutCommande = statut) => {
    setEnCours(true);
    const r = await enregistrerCommande({
      id: commande.id,
      statut: nouveauStatut,
      telephone,
      email,
      remarque,
      lignes: lignes.map((l) => ({ id: l.id, articleId: l.articleId, varianteId: l.varianteId, taille: l.taille, quantite: l.quantite, numero: l.numero, nom: l.nom })),
    });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistrée, mais impossible à relire." : r.erreur);
    toast.success(
      nouveauStatut === statut ? "Commande enregistrée." : nouveauStatut === "cancelled" ? "Commande annulée." : "Commande rétablie.",
    );
    onEnregistree(r.donnees);
  };

  const supprimer = async () => {
    setEnCours(true);
    const r = await supprimerCommande(commande.id).catch(() => ({ ok: false as const, erreur: "La commande n'a pas pu être supprimée." }));
    setEnCours(false);
    setConfirmation(false);
    if (!r.ok) return void toast.error(r.erreur);
    toast.success(`La commande de ${commande.personne} est supprimée.`);
    onSupprimee(commande.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <p className="text-xs text-muted-foreground">
          Reçue le {formaterDateCourte(commande.creeLe)} à {formaterHeure(commande.creeLe)}
          {commande.commandeeLe ? ` · commandée chez Joma le ${formaterDateCourte(commande.commandeeLe)}` : ""}
        </p>

        {peutEditer ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-telephone">Téléphone</Label>
              <Input id="commande-telephone" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-email">E-mail</Label>
              <Input id="commande-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {commande.telephone ? (
            <Button asChild variant="hubSecondary" size="sm">
              <a href={`tel:${commande.telephone.replace(/\s+/g, "")}`}>
                <Phone aria-hidden="true" />
                {commande.telephone}
              </a>
            </Button>
          ) : null}
          {commande.email ? (
            <Button asChild variant="hubSecondary" size="sm">
              <a href={`mailto:${commande.email}`}>
                <Mail aria-hidden="true" />
                {commande.email}
              </a>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Articles</p>
          {lignes.map((l) => {
            const article = catalogue.find((a) => a.id === l.articleId);
            const figee = commande.lignes.find((x) => x.id === l.id);
            const calculee = apercu.ok ? apercu.lignes[lignes.indexOf(l)] : null;
            if (!peutEditer || !article) {
              const affichee = calculee ?? figee;
              return (
                <div key={l.cle} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">{affichee ? resumeLigne(affichee) : "Article disparu"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.quantite} × {affichee ? formaterPrix(affichee.prixUnitaire) : "?"}
                    </span>
                    {peutEditer && !article ? (
                      <span className="block text-xs text-muted-foreground">Article supprimé du catalogue : la ligne garde son nom, sa référence et son prix.</span>
                    ) : null}
                  </span>
                  {peutEditer ? (
                    <Button type="button" variant="hubSecondary" size="sm" aria-label="Retirer la ligne" onClick={() => setLignes((x) => x.filter((y) => y.cle !== l.cle))}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              );
            }
            return (
              <div key={l.cle} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {article.nom}
                      {!article.actif ? <span className="text-muted-foreground"> (retiré)</span> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {calculee ? `${l.quantite} × ${formaterPrix(calculee.prixUnitaire)}` : ""}
                    </span>
                  </span>
                  <Button type="button" variant="hubSecondary" size="sm" aria-label={`Retirer ${article.nom}`} onClick={() => setLignes((x) => x.filter((y) => y.cle !== l.cle))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
                  <Select value={l.varianteId} onValueChange={(varianteId) => changer(l.cle, { varianteId })} disabled={article.variantes.length < 2}>
                    <SelectTrigger aria-label="Couleur" className="w-full">
                      <SelectValue placeholder="Couleur" />
                    </SelectTrigger>
                    <SelectContent>
                      {article.variantes.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.couleur || "Couleur unique"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={l.taille} onValueChange={(taille) => changer(l.cle, { taille })}>
                    <SelectTrigger aria-label="Taille" className="w-full">
                      <SelectValue placeholder="Taille" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Une taille retiree du catalogue depuis la commande reste choisie. */}
                      {l.taille && !article.tailles.includes(l.taille) ? <SelectItem value={l.taille}>{l.taille}</SelectItem> : null}
                      {article.tailles.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Quantité"
                    type="number"
                    min={1}
                    max={20}
                    value={l.quantite}
                    onChange={(e) => changer(l.cle, { quantite: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })}
                  />
                </div>
                {article.floquable ? (
                  <div className="grid grid-cols-[5rem_1fr] gap-2">
                    <Input aria-label="Numéro floqué" inputMode="numeric" placeholder="N°" value={l.numero} onChange={(e) => changer(l.cle, { numero: e.target.value })} />
                    <Input aria-label="Nom floqué" placeholder="Nom au dos" value={l.nom} onChange={(e) => changer(l.cle, { nom: e.target.value.toUpperCase() })} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {peutEditer ? (
            <Select value={ajout} onValueChange={(id) => ajouterArticle(Number(id))}>
              <SelectTrigger aria-label="Ajouter un article" className="w-full">
                <SelectValue placeholder="Ajouter un article…" />
              </SelectTrigger>
              <SelectContent>
                {catalogue.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.actif ? a.nom : `${a.nom} (retiré)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <p className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            {apercu.ok ? (
              <span className="font-semibold tabular-nums">{formaterPrix(apercu.total)}</span>
            ) : (
              <span className="text-xs text-destructive">{apercu.erreur}</span>
            )}
          </p>
        </div>

        {peutEditer ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-statut">Statut</Label>
              <Select value={statut} onValueChange={(s) => setStatut(s as StatutCommande)}>
                <SelectTrigger id="commande-statut" className="w-full data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_COMMANDE.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LIBELLES_STATUT_COMMANDE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-remarque">Remarque</Label>
              <Textarea id="commande-remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Annuler ou supprimer</p>
                <p className="text-xs text-muted-foreground">
                  Annulée, la commande reste dans la liste, estompée, et sort des totaux ; elle se rétablit. Supprimée, elle disparaît pour de bon.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {commande.statut === "cancelled" ? (
                  <Button type="button" variant="hubSecondary" size="sm" disabled={enCours || !apercu.ok} onClick={() => void enregistrer("received")}>
                    <RotateCcw aria-hidden="true" />
                    Rétablir la commande
                  </Button>
                ) : (
                  <Button type="button" variant="hubSecondary" size="sm" disabled={enCours || !apercu.ok} onClick={() => void enregistrer("cancelled")}>
                    <Ban aria-hidden="true" />
                    Annuler la commande
                  </Button>
                )}
                <Button type="button" variant="hubSecondary" size="sm" className="text-destructive" disabled={enCours} onClick={() => setConfirmation(true)}>
                  <Trash2 aria-hidden="true" />
                  Supprimer la commande
                </Button>
              </div>
            </div>
          </>
        ) : commande.remarque ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Remarque</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{commande.remarque}</p>
          </div>
        ) : null}
      </div>

      {peutEditer ? (
        <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button type="button" variant="hubSecondary" onClick={onFermer} disabled={enCours}>
            Fermer
          </Button>
          <Button type="button" variant="hub" onClick={() => void enregistrer()} disabled={enCours || !apercu.ok}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la commande de {commande.personne} ?</DialogTitle>
            <DialogDescription>
              Commande n° {commande.id}, {formaterPrix(commande.total)}. Elle disparaît pour de bon, du Hub comme de la commande groupée. Pour la garder
              hors des totaux, annulez-la plutôt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="hubSecondary" onClick={() => setConfirmation(false)}>
              Garder
            </Button>
            <Button type="button" variant="hub" className="bg-destructive text-white hover:bg-destructive/90" disabled={enCours} onClick={() => void supprimer()}>
              Supprimer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
