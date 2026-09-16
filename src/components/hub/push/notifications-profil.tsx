"use client";

import { BellOff, BellRing, Send } from "lucide-react";
import { useEffect, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { Pastille } from "@/components/hub/mise-en-page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  enregistrerAbonnement,
  envoyerNotificationDeTest,
  lireClePublique,
  reglerFluxNotifies,
  retirerAbonnement,
} from "@/hub/actions/notifications";
import EncartInstallation from "./encart-installation";
import {
  abonnerAppareil,
  abonnerEtatPush,
  desabonnerAppareil,
  ecouterInstallation,
  etatPushServeur,
  inscrireServiceWorker,
  lireEtatPush,
  rafraichirEtatPush,
} from "./etat-push";

type Flux = { id: number; nom: string; couleur: string | null };

/**
 * Le bloc des notifications du profil : cet appareil, les flux notifies, un
 * essai. Sur iPhone, tant que le Hub n'est pas sur l'ecran d'accueil, il
 * explique pourquoi rien n'est possible.
 */
export default function NotificationsProfil({
  flux,
  fluxNotifiesIds,
  pushActif,
  appareils,
}: {
  flux: Flux[];
  fluxNotifiesIds: number[];
  /** Le reglage de la personne, tous appareils confondus. */
  pushActif: boolean;
  /** Le nombre d'appareils abonnes, tous confondus. */
  appareils: number;
}) {
  const etat = useSyncExternalStore(abonnerEtatPush, lireEtatPush, etatPushServeur);
  const [enCours, lancer] = useTransition();

  useEffect(() => {
    const arreter = ecouterInstallation();
    void inscrireServiceWorker().then(() => rafraichirEtatPush());
    return arreter;
  }, []);

  const activer = () => {
    lancer(async () => {
      const cle = await lireClePublique();
      if (!cle.ok || !cle.donnees) return void toast.error(cle.ok ? "Clé absente." : cle.erreur);
      const r = await abonnerAppareil(cle.donnees.cle);
      if (!r.ok) return void toast.error(r.erreur);
      const enregistre = await enregistrerAbonnement({ ...r.abonnement, userAgent: navigator.userAgent.slice(0, 500) });
      if (!enregistre.ok) return void toast.error(enregistre.erreur);
      await rafraichirEtatPush();
      toast.success("Notifications activées sur cet appareil.");
    });
  };

  const desactiver = () => {
    lancer(async () => {
      const endpoint = await desabonnerAppareil();
      if (endpoint) {
        const r = await retirerAbonnement({ endpoint });
        if (!r.ok) return void toast.error(r.erreur);
      }
      await rafraichirEtatPush();
      toast.success("Notifications désactivées sur cet appareil.");
    });
  };

  const basculerFlux = (id: number, coche: boolean) => {
    const suivants = coche ? [...fluxNotifiesIds, id] : fluxNotifiesIds.filter((f) => f !== id);
    lancer(async () => {
      const r = await reglerFluxNotifies({ fluxIds: suivants });
      if (!r.ok) toast.error(r.erreur);
    });
  };

  const essayer = () => {
    lancer(async () => {
      const r = await envoyerNotificationDeTest();
      if (!r.ok) return void toast.error(r.erreur);
      toast.success(`Notification envoyée à ${r.donnees?.envoyes ?? 1} appareil${(r.donnees?.envoyes ?? 1) > 1 ? "s" : ""}.`);
    });
  };

  const iosSansInstallation = etat.pret && etat.ios && !etat.installe;
  const bloque = etat.pret && (!etat.supporte || etat.permission === "denied" || iosSansInstallation);

  return (
    <div className="flex flex-col divide-y divide-border">
      <EncartInstallation etat={etat} />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Cet appareil</p>
          <p className="text-xs text-muted-foreground">
            {!etat.pret
              ? "Vérification…"
              : !etat.supporte
                ? "Ce navigateur ne sait pas recevoir de notifications."
                : iosSansInstallation
                  ? "Sur iPhone, les notifications ne marchent qu'une fois le Hub sur l'écran d'accueil."
                  : etat.permission === "denied"
                    ? "Les notifications sont bloquées dans les réglages du navigateur."
                    : etat.abonne
                      ? "Abonné aux notifications."
                      : "Pas encore abonné."}
          </p>
        </div>
        {etat.abonne ? (
          <Button type="button" variant="hubSecondary" size="sm" disabled={enCours} onClick={desactiver}>
            <BellOff aria-hidden="true" />
            Désactiver
          </Button>
        ) : (
          <Button type="button" variant="hub" size="sm" disabled={enCours || bloque || !etat.pret} onClick={activer}>
            <BellRing aria-hidden="true" />
            Activer
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-sm font-medium">Flux notifiés</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Les rappels ne concernent que ces flux, sur tous vos appareils abonnés.
          {appareils > 0 ? ` ${appareils} appareil${appareils > 1 ? "s" : ""} abonné${appareils > 1 ? "s" : ""}.` : ""}
        </p>
        {flux.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun flux ouvert.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flux.map((f) => (
              <li key={f.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={fluxNotifiesIds.includes(f.id)}
                    disabled={enCours}
                    onCheckedChange={(v) => basculerFlux(f.id, v === true)}
                  />
                  <Pastille couleur={f.couleur} />
                  {f.nom}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {pushActif ? "Les rappels sont actifs pour votre compte." : "Aucun appareil abonné : pas de rappel."}
        </p>
        <Button type="button" variant="hubSecondary" size="sm" disabled={enCours || appareils === 0} onClick={essayer}>
          <Send aria-hidden="true" />
          Envoyer une notification de test
        </Button>
      </div>
    </div>
  );
}
