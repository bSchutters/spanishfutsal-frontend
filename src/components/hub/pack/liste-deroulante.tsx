import { cn } from "@/lib/utils";

/**
 * Une liste deroulante native, habillee comme les champs du Hub. Native
 * plutot que le Select du design : sur telephone elle ouvre le selecteur du
 * systeme, plus rapide quand une commande compte dix lignes.
 */
export default function ListeDeroulante({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border-2 border-spanish-bg-lighter bg-spanish-bg-light px-2 py-1 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-spanish-bg-lighter focus-visible:ring-[3px] focus-visible:ring-spanish-accent/50",
        className,
      )}
      {...props}
    />
  );
}
