/**
 * L'etat des notifications sur cet appareil, lu depuis le navigateur et
 * partage par `useSyncExternalStore` : le serveur voit un etat inconnu, le
 * navigateur le sien une fois interroge, sans passer par un effet.
 */
export type EtatPush = {
  /** Tant que le navigateur n'a pas ete interroge. */
  pret: boolean;
  supporte: boolean;
  permission: "default" | "granted" | "denied";
  /** Cet appareil est-il abonne ? */
  abonne: boolean;
  endpoint: string | null;
  /** Ouvert depuis l'ecran d'accueil. */
  installe: boolean;
  /** iPhone ou iPad : le push n'existe qu'une fois installe. */
  ios: boolean;
  /** Un telephone ou une tablette : le seul cas ou proposer l'installation a un sens. */
  mobile: boolean;
  /** Un navigateur propose l'installation native. */
  installable: boolean;
};

const INCONNU: EtatPush = {
  pret: false,
  supporte: false,
  permission: "default",
  abonne: false,
  endpoint: null,
  installe: false,
  ios: false,
  mobile: false,
  installable: false,
};

export const CHEMIN_SW = "/hub-sw.js";
export const PERIMETRE_SW = "/hub";

let etat: EtatPush = INCONNU;
let invite: { prompt: () => Promise<unknown> } | null = null;
const abonnes = new Set<() => void>();

const notifier = () => abonnes.forEach((cb) => cb());

export function lireEtatPush(): EtatPush {
  return etat;
}

export function etatPushServeur(): EtatPush {
  return INCONNU;
}

export function abonnerEtatPush(callback: () => void): () => void {
  abonnes.add(callback);
  return () => {
    abonnes.delete(callback);
  };
}

function estIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function estMobile(): boolean {
  return estIos() || /Android|Mobile|Tablet/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
}

function estInstalle(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Interroge le navigateur et publie l'etat. A appeler une fois la page montee. */
export async function rafraichirEtatPush(): Promise<void> {
  if (typeof window === "undefined") return;
  const supporte = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let abonne = false;
  let endpoint: string | null = null;
  if (supporte) {
    try {
      const inscription = await navigator.serviceWorker.getRegistration(PERIMETRE_SW);
      const abonnement = await inscription?.pushManager.getSubscription();
      abonne = !!abonnement;
      endpoint = abonnement?.endpoint ?? null;
    } catch {
      // Un navigateur qui refuse : on reste sur « pas abonne ».
    }
  }
  etat = {
    pret: true,
    supporte,
    permission: supporte ? Notification.permission : "default",
    abonne,
    endpoint,
    installe: estInstalle(),
    ios: estIos(),
    mobile: estMobile(),
    installable: invite !== null,
  };
  notifier();
}

/** Garde l'invitation d'installation que certains navigateurs proposent, pour la rejouer sur un bouton. */
export function ecouterInstallation(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const surInvite = (e: Event) => {
    e.preventDefault();
    invite = e as unknown as { prompt: () => Promise<unknown> };
    etat = { ...etat, installable: true };
    notifier();
  };
  const surInstalle = () => {
    invite = null;
    etat = { ...etat, installable: false, installe: true };
    notifier();
  };
  window.addEventListener("beforeinstallprompt", surInvite);
  window.addEventListener("appinstalled", surInstalle);
  return () => {
    window.removeEventListener("beforeinstallprompt", surInvite);
    window.removeEventListener("appinstalled", surInstalle);
  };
}

export async function proposerInstallation(): Promise<void> {
  if (!invite) return;
  await invite.prompt();
  invite = null;
  etat = { ...etat, installable: false };
  notifier();
}

/** Inscrit le service worker du Hub, une fois. Sans effet la ou il n'est pas supporte. */
export async function inscrireServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(CHEMIN_SW, { scope: PERIMETRE_SW });
  } catch {
    return null;
  }
}

function base64VersOctets(base64: string): Uint8Array {
  const complete = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob(complete.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

/** Demande la permission et abonne cet appareil. Renvoie l'abonnement a envoyer au serveur, ou l'erreur. */
export async function abonnerAppareil(
  clePublique: string,
): Promise<{ ok: true; abonnement: { endpoint: string; keys: { p256dh: string; auth: string } } } | { ok: false; erreur: string }> {
  const inscription = (await navigator.serviceWorker.getRegistration(PERIMETRE_SW)) ?? (await inscrireServiceWorker());
  if (!inscription) return { ok: false, erreur: "Le service worker ne s'installe pas sur ce navigateur." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, erreur: "Les notifications sont refusées dans les réglages du navigateur." };
  try {
    const pret = await navigator.serviceWorker.ready;
    const abonnement =
      (await pret.pushManager.getSubscription()) ??
      (await pret.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64VersOctets(clePublique) as BufferSource,
      }));
    const json = abonnement.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, erreur: "Abonnement incomplet." };
    return { ok: true, abonnement: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } };
  } catch (erreur) {
    return { ok: false, erreur: erreur instanceof Error ? erreur.message : "L'abonnement a échoué." };
  }
}

/** Desabonne cet appareil. Renvoie l'adresse a retirer cote serveur. */
export async function desabonnerAppareil(): Promise<string | null> {
  const inscription = await navigator.serviceWorker.getRegistration(PERIMETRE_SW);
  const abonnement = await inscription?.pushManager.getSubscription();
  if (!abonnement) return null;
  const endpoint = abonnement.endpoint;
  await abonnement.unsubscribe();
  return endpoint;
}
