"use client";

import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import BoutonCopier from "@/components/hub/bouton-copier";
import { Panneau } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { enregistrerReglagesPack, regenererLienPack } from "@/hub/actions/pack";
import type { ReglagesPack } from "@/hub/pack/schema";

const urlPage = (base: string, jeton: string) => `${base}/pack/${jeton}`;

/**
 * La page des joueurs, reglee depuis le Hub : ouverte ou fermee, date
 * limite, mot de passe, prix des flocages, et le lien a partager avec son
 * QR code. Un nouveau lien coupe aussitot l'ancien.
 */
export default function ReglagesPackForm({ reglages, baseUrl }: { reglages: ReglagesPack; baseUrl: string }) {
  const [actuels, setActuels] = useState(reglages);
  const [ouvert, setOuvert] = useState(reglages.ouvert);
  const [dateLimite, setDateLimite] = useState(reglages.dateLimite ?? "");
  const [motDePasse, setMotDePasse] = useState(reglages.motDePasse);
  const [prixNumero, setPrixNumero] = useState(String(reglages.flocage.numero));
  const [prixNom, setPrixNom] = useState(String(reglages.flocage.nom));
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, lancer] = useTransition();

  const lien = urlPage(baseUrl, actuels.jeton);

  const enregistrer = () =>
    lancer(async () => {
      const r = await enregistrerReglagesPack({
        ouvert,
        dateLimite: dateLimite || null,
        motDePasse,
        prixNumero: Number(prixNumero.replace(",", ".")),
        prixNom: Number(prixNom.replace(",", ".")),
      });
      if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Enregistré, mais impossible à relire." : r.erreur);
      setActuels(r.donnees);
      toast.success(r.donnees.ouvert ? "Réglages enregistrés. Les commandes sont ouvertes." : "Réglages enregistrés.");
    });

  const regenerer = () =>
    lancer(async () => {
      const r = await regenererLienPack();
      setConfirmation(false);
      if (!r.ok || !r.donnees) return void toast.error(r.ok ? "Lien changé, mais impossible à relire." : r.erreur);
      setActuels(r.donnees);
      toast.success("Nouveau lien créé. L'ancien ne fonctionne plus.");
    });

  return (
    <Panneau titre="Page des joueurs" description="Le lien à partager, son mot de passe et les prix des flocages.">
      <div className="flex flex-col gap-5 px-4 py-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Commandes ouvertes</span>
            <span className="block text-xs text-muted-foreground">Fermée, la page affiche que les commandes sont closes.</span>
          </span>
          <Switch checked={ouvert} onCheckedChange={setOuvert} aria-label="Commandes ouvertes" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-date-limite">Date limite</Label>
            <Input id="pack-date-limite" type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">Dernier jour pour commander. Vide : pas de limite.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-mot-de-passe">Mot de passe</Label>
            <Input
              id="pack-mot-de-passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">À donner aux joueurs avec le lien. Le changer les déconnecte tous.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-prix-numero">Flocage du numéro (€)</Label>
            <Input
              id="pack-prix-numero"
              inputMode="decimal"
              value={prixNumero}
              onChange={(e) => setPrixNumero(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pack-prix-nom">Flocage du nom (€)</Label>
            <Input id="pack-prix-nom" inputMode="decimal" value={prixNom} onChange={(e) => setPrixNom(e.target.value)} className="h-10" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="hub" disabled={enCours} onClick={enregistrer}>
            {enCours ? "Enregistrement…" : "Enregistrer les réglages"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Label htmlFor="pack-lien">Lien de la page</Label>
          <Input id="pack-lien" value={lien} readOnly onFocus={(e) => e.currentTarget.select()} className="h-10 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <BoutonCopier valeur={lien} className="h-9" />
            <Button asChild variant="hubSecondary" className="h-9">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- un fichier a telecharger, pas une page */}
              <a href="/api/hub/pack/qr?telecharger=1">
                <Download aria-hidden="true" />
                QR code
              </a>
            </Button>
            <Button asChild variant="hubSecondary" className="h-9">
              <a href={lien} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Ouvrir
              </a>
            </Button>
            <Button type="button" variant="hubSecondary" className="h-9" disabled={enCours} onClick={() => setConfirmation(true)}>
              <RefreshCw aria-hidden="true" />
              Nouveau lien
            </Button>
          </div>
          {!actuels.motDePasse ? (
            <p className="text-xs font-medium text-destructive">Aucun mot de passe : tant qu&apos;il manque, personne n&apos;entre sur la page.</p>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmation} onOpenChange={setConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau lien ?</DialogTitle>
            <DialogDescription>
              L&apos;ancien lien et son QR code cesseront aussitôt de fonctionner : il faudra repartager le nouveau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="hubSecondary" onClick={() => setConfirmation(false)}>
              Garder l&apos;ancien
            </Button>
            <Button type="button" variant="hub" disabled={enCours} onClick={regenerer}>
              Créer le nouveau lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panneau>
  );
}
