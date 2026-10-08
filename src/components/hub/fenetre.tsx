"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Les fenetres du Hub : au centre de l'ecran, plus de panneau glisse depuis
 * la droite (Bryan, 08/10/2026). Elles prennent la hauteur de leur contenu,
 * jusqu'a celle de l'ecran ; la hauteur maximale, qui tient compte de la
 * barre d'etat de l'app installee, est dans hub.css (.fenetre-hub).
 */
export const Fenetre = Dialog;
export const FenetreDescription = DialogDescription;

export function FenetreContenu({
  className,
  large = false,
  defileEntiere = false,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  /** Un formulaire long : un peu plus large. */
  large?: boolean;
  /**
   * Tout defile, en-tete compris, pour une fiche a lire. Sinon l'en-tete et
   * la barre des boutons restent en place et seul le corps defile.
   */
  defileEntiere?: boolean;
}) {
  return (
    <DialogContent
      className={cn(
        "fenetre-hub flex flex-col gap-0 p-0",
        defileEntiere ? "overflow-y-auto" : "overflow-hidden",
        large ? "sm:max-w-xl" : "sm:max-w-lg",
        className,
      )}
      {...props}
    />
  );
}

/** L'en-tete : le titre a gauche, la place de la croix de fermeture a droite. */
export function FenetreEntete({ className, ...props }: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn("shrink-0 gap-1.5 border-b border-border px-5 py-4 pe-12 text-start", className)} {...props} />;
}

export function FenetreTitre({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("text-base leading-snug", className)} {...props} />;
}
