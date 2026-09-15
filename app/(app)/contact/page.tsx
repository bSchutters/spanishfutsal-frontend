import dynamic from "next/dynamic";

import { Separator } from "@/components/ui/separator";
import { contactMetadata } from "./metadata";

/**
 * Charge a part : le menu precharge chaque page, et Next telecharge avec
 * elle les modules clients qu'elle reference. Importe directement, le
 * formulaire (react-hook-form, zod et ses traductions, sonner : 106 Ko
 * compresses depuis zod 4) partait donc sur toutes les pages du site. Avec
 * `dynamic`, seule la page contact le demande, au moment de l'afficher. Il
 * reste rendu cote serveur.
 */
const ContactForm = dynamic(
  () => import("@/components/contact/contact-form"),
);

// Export natif de Next, desormais possible : `MetadataHead` s'appuyait sur
// `next/head`, une API du Pages Router sans effet ici. La page servait donc le
// titre et la description generiques du layout au lieu des siens.
export const metadata = contactMetadata;

/**
 * Composant serveur : seul le formulaire reste client, ce qui sort
 * react-hook-form, zod et sonner du chargement initial de la page.
 */
export default function Contact() {
  return (
    <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
      <div className=" z-10 lg:py-20 py-14 lg:px-0 px-10 rounded-2xl lg:container md:max-w-2xl sm:max-w-xl max-w-md mx-auto mb-20">
        <div className="flex flex-col gap-10 items-center justify-center max-w-4xl mx-auto">
          <h1 className="text-4xl font-marjorie italic font-bold">
            Nous contacter
          </h1>
          <Separator className="mx-auto bg-spanish-bg-lighter" />
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
