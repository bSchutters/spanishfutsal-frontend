import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Ou va le blason par rapport au nom, par palier de largeur.
 *
 * `true` ou `false` vaut pour toutes les largeurs. L'objet fixe la valeur a
 * partir d'un palier (`sm` des 640 px, `md` des 768 px), chaque palier
 * heritant du precedent : `{ base: true, md: false }` met le blason devant sur
 * telephone et derriere a partir de la tablette.
 *
 * Tout passe par des classes responsive et non par un hook de largeur : le
 * serveur ne connait pas la fenetre, et decider apres l'hydratation faisait
 * sauter les cartes une fois affichees (0,05 de CLS sur la page des matchs).
 */
export type LogoDevant =
  | boolean
  | { base?: boolean; sm?: boolean; md?: boolean };

interface TeamProps {
  logoFirst?: LogoDevant;
  isNextMatch?: boolean;
  isMatchPage?: boolean;
  logo: string;
  teamName: string;
  isClub?: boolean;
  className?: string;
}

type Palier = "base" | "sm" | "md";
const PALIERS: Palier[] = ["base", "sm", "md"];

// Tout en toutes lettres : Tailwind ne genere que les classes qu'il lit.
const ORDRE_NOM = {
  base: { devant: "order-2", derriere: "order-none" },
  sm: { devant: "sm:order-2", derriere: "sm:order-none" },
  md: { devant: "md:order-2", derriere: "md:order-none" },
} as const;

const ALIGNEMENT_NOM = {
  base: { start: "text-start", center: "text-center", end: "text-end" },
  sm: { start: "sm:text-start", center: "sm:text-center", end: "sm:text-end" },
  md: { start: "md:text-start", center: "md:text-center", end: "md:text-end" },
} as const;

const JUSTIFICATION = {
  base: { devant: "justify-start", derriere: "justify-end" },
  sm: { devant: "sm:justify-start", derriere: "sm:justify-end" },
  md: { devant: "md:justify-start", derriere: "md:justify-end" },
} as const;

function parPalier(logoFirst: LogoDevant | undefined): Record<Palier, boolean> {
  const regle =
    typeof logoFirst === "object" ? logoFirst : { base: Boolean(logoFirst) };
  let courant = regle.base ?? false;
  const resultat = {} as Record<Palier, boolean>;
  for (const palier of PALIERS) {
    if (palier !== "base" && regle[palier] !== undefined) {
      courant = regle[palier] as boolean;
    }
    resultat[palier] = courant;
  }
  return resultat;
}

export default function Team({
  logoFirst,
  logo,
  teamName,
  isClub,
  className,
  isNextMatch,
  isMatchPage,
}: TeamProps) {
  const devant = parPalier(logoFirst);

  const classesConteneur = PALIERS.map(
    (p) => JUSTIFICATION[p][devant[p] ? "devant" : "derriere"],
  );

  const classesNom = PALIERS.flatMap((p) => {
    // Sur la page des matchs, sous 768 px, la carte est en colonne et le nom
    // centre, que le blason soit devant ou non.
    const colonneMatch = isMatchPage && p !== "md";
    const alignement = colonneMatch
      ? "center"
      : devant[p]
        ? p === "base"
          ? "center"
          : "start"
        : "end";
    return [
      ORDRE_NOM[p][devant[p] ? "devant" : "derriere"],
      ALIGNEMENT_NOM[p][alignement],
    ];
  });

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-4",
        // Page des matchs : colonne jusqu'a la tablette, ligne ensuite.
        isMatchPage ? "flex-col md:flex-row" : "flex-col sm:flex-row",
        classesConteneur,
        className,
      )}
    >
      <p
        className={cn(
          "uppercase lg:text-base xl:text-xl",
          // Blason devant sur telephone : le nom passe dessous, en plus petit.
          devant.base ? "text-xs" : "text-sm",
          "sm:text-sm",
          // Apres les tailles, et pas avant : `text-*` fixe aussi l'interligne,
          // et tailwind-merge retire un `leading-*` place devant. Sur telephone
          // le nom en `text-xs` tient sur deux lignes : 16 px les separent.
          "leading-4 sm:leading-3 lg:leading-4",
          classesNom,
          isMatchPage && "max-md:max-w-full",
          isClub && "font-bold",
        )}
      >
        {teamName}
      </p>
      <div className="relative">
        {/*
          Des dimensions plutot que 0 x 0 : le navigateur reserve la place du
          blason avant qu'il n'arrive, au lieu de pousser la ligne a son
          chargement. La taille affichee reste celle des classes. 96 et non
          une des hauteurs affichees (40, 48, 64, 80 px) : en developpement,
          Next compare la taille rendue aux attributs et avertit des qu'une
          seule des deux coincide, ce qui arrivait pour tout blason non carre
          affiche a 80 px de haut.
        */}
        <Image
          src={logo}
          alt=""
          width={96}
          height={96}
          className={cn(
            "w-auto",
            isNextMatch ? "md:h-16 sm:h-12 h-10" : "h-16",
            isMatchPage ? "md:max-h-20" : "xl:h-20",
          )}
        />
      </div>
    </div>
  );
}
