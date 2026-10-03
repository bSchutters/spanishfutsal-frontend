"use client";

import { Mail, Phone, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enregistrerCommande } from "@/hub/actions/pack";
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
import ListeDeroulante from "./liste-deroulante";

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
}: {
  commande: Commande;
  catalogue: Article[];
  flocage: PrixFlocage;
  peutEditer: boolean;
  onFermer: () => void;
  onEnregistree: (commande: Commande) => void;
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

  const enregistrer = async () => {
    setEnCours(true);
    const r = await enregistrerCommande({
      id: commande.id,
      statut,
      telephone,
      email,
      remarque,
      lignes: lignes.map((l) => ({ id: l.id, articleId: l.articleId, varianteId: l.varianteId, taille: l.taille, quantite: l.quantite, numero: l.numero, nom: l.nom })),
    });
    setEnCours(false);
    if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistrée, mais impossible à relire." : r.erreur);
    toast.success("Commande enregistrée.");
    onEnregistree(r.donnees);
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
                  <ListeDeroulante
                    aria-label="Couleur"
                    value={l.varianteId}
                    onChange={(e) => changer(l.cle, { varianteId: e.target.value })}
                    disabled={article.variantes.length < 2}
                  >
                    {article.variantes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.couleur || "Couleur unique"}
                      </option>
                    ))}
                  </ListeDeroulante>
                  <ListeDeroulante aria-label="Taille" value={l.taille} onChange={(e) => changer(l.cle, { taille: e.target.value })}>
                    {article.tailles.includes(l.taille) ? null : <option value={l.taille}>{l.taille}</option>}
                    {article.tailles.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </ListeDeroulante>
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
            <ListeDeroulante aria-label="Ajouter un article" value={ajout} onChange={(e) => ajouterArticle(Number(e.target.value))}>
              <option value="">Ajouter un article…</option>
              {catalogue.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                  {a.actif ? "" : " (retiré)"}
                </option>
              ))}
            </ListeDeroulante>
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
              <ListeDeroulante id="commande-statut" value={statut} onChange={(e) => setStatut(e.target.value as StatutCommande)} className="h-10">
                {STATUTS_COMMANDE.map((s) => (
                  <option key={s} value={s}>
                    {LIBELLES_STATUT_COMMANDE[s]}
                  </option>
                ))}
              </ListeDeroulante>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commande-remarque">Remarque</Label>
              <Textarea id="commande-remarque" value={remarque} onChange={(e) => setRemarque(e.target.value)} rows={3} />
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
            Annuler
          </Button>
          <Button type="button" variant="hub" onClick={enregistrer} disabled={enCours || !apercu.ok}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
