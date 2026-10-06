import type { Article, Commande, LigneCommande, LigneSaisie, PrixFlocage, RemiseArticle } from "./schema";

/**
 * Les calculs du Pack : le prix d'une ligne, la commande construite depuis
 * le catalogue, et le recapitulatif a envoyer a Joma. Fonctions pures.
 *
 * Les montants passent par les centimes : 2,50 + 5 + 35 reste exact.
 */

const enCentimes = (euros: number) => Math.round(euros * 100);
const enEuros = (centimes: number) => centimes / 100;

/** « 42,50 € » */
export function formaterPrix(euros: number): string {
  return `${euros.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** La description d'une ligne en une phrase : « Maillot bleu · M · n° 10 RUBEN ». */
export function resumeLigne(l: { article: string; couleur: string; taille: string; numero: string; nom: string }) {
  const flocage = [l.numero ? `n° ${l.numero}` : "", l.nom].filter(Boolean).join(" ");
  return [[l.article, l.couleur.toLowerCase()].filter(Boolean).join(" "), l.taille, flocage].filter(Boolean).join(" · ");
}

/** La reference complete chez Joma : le modele, un point, le code couleur, « 104263.339 ». */
export function referenceComplete(reference: string, codeCouleur: string): string {
  return [reference.trim(), codeCouleur.trim()].filter(Boolean).join(".");
}

/** Le pourcentage de remise d'un article : le general, aucun, ou le sien. */
export function tauxRemise(remise: RemiseArticle, remiseGenerale: number): number {
  if (remise.mode === "none") return 0;
  if (remise.mode === "custom") return remise.taux ?? 0;
  return remiseGenerale;
}

/** Un prix apres remise, arrondi au centime. */
export function prixApresRemise(prixCatalogue: number, taux: number): number {
  return enEuros(Math.round((enCentimes(prixCatalogue) * (100 - taux)) / 100));
}

/**
 * Le prix que paie le joueur pour un article, flocage non compris : le prix
 * catalogue, remise du club deduite. C'est la seule regle a changer si le
 * club decidait de garder la remise pour lui.
 */
export function prixJoueur(prixCatalogue: number, remise: RemiseArticle, remiseGenerale: number): number {
  return prixApresRemise(prixCatalogue, tauxRemise(remise, remiseGenerale));
}

/** Le prix d'une piece : l'article, plus le numero et le nom s'ils sont floques. */
export function prixUnitaire(prixArticle: number, flocage: PrixFlocage, numero: string, nom: string): number {
  return enEuros(
    enCentimes(prixArticle) + (numero ? enCentimes(flocage.numero) : 0) + (nom ? enCentimes(flocage.nom) : 0),
  );
}

/**
 * Le montant minimum d'une commande chez Joma (regle donnee par Bryan le
 * 06/10/2026). Il se compare aux montants des commandes, prix remises et
 * flocages compris, ceux que le club paie.
 */
export const MINIMUM_JOMA = 150;

/** Ou en est un montant face au minimum Joma : atteint ou non, ce qui manque, la part remplie (de 0 a 1). */
export function avancementJoma(montant: number): { atteint: boolean; reste: number; part: number } {
  const reste = enEuros(Math.max(0, enCentimes(MINIMUM_JOMA) - enCentimes(montant)));
  return { atteint: reste === 0, reste, part: Math.min(1, Math.max(0, montant / MINIMUM_JOMA)) };
}

/**
 * Les commandes telles que Joma doit les lire : sans les articles ecartes
 * (designes par leur nom affiche, celui que le club connait), et chaque ligne
 * sous le nom Joma de son article, ou son nom affiche s'il n'en a pas.
 */
export function enNomsJoma(
  commandes: readonly Commande[],
  catalogue: readonly Pick<Article, "id" | "nomJoma">[],
  articlesEcartes: ReadonlySet<string> = new Set(),
): Commande[] {
  const nomsJoma = new Map(catalogue.map((a) => [a.id, a.nomJoma.trim()]));
  return commandes.map((c) => ({
    ...c,
    lignes: c.lignes
      .filter((l) => !articlesEcartes.has(l.article))
      .map((l) => ({ ...l, article: (l.articleId !== null && nomsJoma.get(l.articleId)) || l.article })),
  }));
}

/** Les tags du catalogue, chacun une fois (a la casse pres), dans l'ordre ou les articles les portent. */
export function tagsDuCatalogue(articles: readonly Pick<Article, "tags">[]): string[] {
  const vus = new Map<string, string>();
  for (const a of articles) for (const t of a.tags) if (!vus.has(t.toLowerCase())) vus.set(t.toLowerCase(), t);
  return [...vus.values()];
}

/** Les articles qui portent un tag, ou tous sans tag choisi. */
export function filtrerParTag<T extends Pick<Article, "tags">>(articles: readonly T[], tag: string | null): T[] {
  if (!tag) return [...articles];
  const cherche = tag.toLowerCase();
  return articles.filter((a) => a.tags.some((t) => t.toLowerCase() === cherche));
}

/** Le total d'une liste de lignes. */
export function totalDes(lignes: readonly Pick<LigneCommande, "prixUnitaire" | "quantite">[]): number {
  return enEuros(lignes.reduce((somme, l) => somme + enCentimes(l.prixUnitaire) * l.quantite, 0));
}

export type Construction = { ok: true; lignes: LigneCommande[]; total: number } | { ok: false; erreur: string };

/**
 * Les lignes d'une commande, construites depuis le catalogue et non depuis
 * ce que le navigateur envoie : nom, reference et prix viennent de la base.
 *
 * Depuis la page des joueurs, seuls les articles actifs passent. Depuis le
 * Hub, `anciennes` porte les lignes deja enregistrees : une ligne dont
 * l'article, la couleur et la presence du numero et du nom n'ont pas change
 * garde son prix d'origine, meme si le catalogue a bouge depuis. Les autres
 * prennent le prix du moment.
 */
export function construireLignes(
  saisies: readonly LigneSaisie[],
  catalogue: readonly Article[],
  flocage: PrixFlocage,
  options: { inactifsAdmis: boolean; anciennes?: readonly LigneCommande[] },
): Construction {
  const lignes: LigneCommande[] = [];
  for (const saisie of saisies) {
    const article = catalogue.find((a) => a.id === saisie.articleId);
    // L'article d'une ligne deja enregistree a ete supprime : la ligne garde
    // sa copie (nom, couleur, reference, prix), seule la quantite peut changer.
    const orpheline = !article && saisie.id ? options.anciennes?.find((l) => l.id === saisie.id) : undefined;
    if (orpheline) {
      lignes.push({ ...orpheline, quantite: saisie.quantite });
      continue;
    }
    if (!article || (!article.actif && !options.inactifsAdmis)) {
      return { ok: false, erreur: "Un article n'est plus proposé. Rechargez la page." };
    }
    const variante = article.variantes.find((v) => v.id === saisie.varianteId);
    if (!variante) return { ok: false, erreur: `${article.nom} : cette couleur n'existe plus.` };
    if (!article.tailles.includes(saisie.taille)) {
      return { ok: false, erreur: `${article.nom} : la taille ${saisie.taille} n'est pas proposée.` };
    }
    const numero = article.floquable ? saisie.numero : "";
    const nom = article.floquable ? saisie.nom.toUpperCase() : "";
    if (!article.floquable && (saisie.numero || saisie.nom)) {
      return { ok: false, erreur: `${article.nom} ne se floque pas.` };
    }

    const ancienne = saisie.id ? options.anciennes?.find((l) => l.id === saisie.id) : undefined;
    const prixInchange =
      ancienne &&
      ancienne.articleId === article.id &&
      ancienne.varianteId === variante.id &&
      Boolean(ancienne.numero) === Boolean(numero) &&
      Boolean(ancienne.nom) === Boolean(nom);

    lignes.push({
      id: ancienne ? ancienne.id : null,
      articleId: article.id,
      varianteId: variante.id,
      article: article.nom,
      couleur: variante.couleur,
      reference: referenceComplete(article.reference, variante.codeCouleur),
      taille: saisie.taille,
      quantite: saisie.quantite,
      numero,
      nom,
      prixUnitaire: prixInchange ? ancienne.prixUnitaire : prixUnitaire(article.prix, flocage, numero, nom),
    });
  }
  return { ok: true, lignes, total: totalDes(lignes) };
}

/** La date limite est-elle passee ? Le jour limite reste ouvert jusqu'a minuit, a Bruxelles. */
export function dateLimitePassee(dateLimite: string | null, aujourdHui: string): boolean {
  return dateLimite !== null && aujourdHui > dateLimite;
}

/** Une ligne du recapitulatif : une reference, une couleur et une taille. */
export type TotalJoma = {
  reference: string;
  article: string;
  couleur: string;
  taille: string;
  quantite: number;
};

/** Une piece a floquer, regroupee quand le meme flocage revient sur la meme piece. */
export type FlocageJoma = TotalJoma & { numero: string; nom: string };

export type RecapJoma = {
  commandes: number;
  pieces: number;
  totaux: TotalJoma[];
  flocages: FlocageJoma[];
};

const comparer = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

/**
 * Ce qu'il faut commander chez Joma pour un ensemble de commandes : les
 * quantites par article, couleur et taille, puis le detail des flocages,
 * parce que Joma doit savoir quoi imprimer sur chaque piece. Les articles
 * ecartes (par leur nom) ne comptent pas. Ni prix ni noms de joueurs : ce
 * document part chez le fournisseur.
 */
export function recapJoma(
  commandes: readonly Pick<Commande, "lignes">[],
  articlesEcartes: ReadonlySet<string> = new Set(),
  ordreDesTailles: (article: string) => readonly string[] = () => [],
): RecapJoma {
  const totaux = new Map<string, TotalJoma>();
  const flocages = new Map<string, FlocageJoma>();
  let pieces = 0;
  let retenues = 0;

  for (const commande of commandes) {
    const lignes = commande.lignes.filter((l) => !articlesEcartes.has(l.article));
    if (lignes.length > 0) retenues += 1;
    for (const l of lignes) {
      pieces += l.quantite;
      const cle = [l.reference, l.article, l.couleur, l.taille].join("\u0000");
      const total = totaux.get(cle) ?? { reference: l.reference, article: l.article, couleur: l.couleur, taille: l.taille, quantite: 0 };
      total.quantite += l.quantite;
      totaux.set(cle, total);
      if (l.numero || l.nom) {
        const cleFlocage = [cle, l.numero, l.nom].join("\u0000");
        const flocage = flocages.get(cleFlocage) ?? { ...total, quantite: 0, numero: l.numero, nom: l.nom };
        flocage.quantite += l.quantite;
        flocages.set(cleFlocage, flocage);
      }
    }
  }

  const rangTaille = (article: string, taille: string) => {
    const rang = ordreDesTailles(article).indexOf(taille);
    return rang === -1 ? Number.MAX_SAFE_INTEGER : rang;
  };
  const trier = <T extends TotalJoma>(a: T, b: T) =>
    comparer(a.article, b.article) ||
    comparer(a.couleur, b.couleur) ||
    rangTaille(a.article, a.taille) - rangTaille(b.article, b.taille) ||
    comparer(a.taille, b.taille);

  return {
    commandes: retenues,
    pieces,
    totaux: [...totaux.values()].sort(trier),
    flocages: [...flocages.values()].sort((a, b) => trier(a, b) || comparer(a.numero, b.numero) || comparer(a.nom, b.nom)),
  };
}
