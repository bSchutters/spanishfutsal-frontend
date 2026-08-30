import ContactForm from "@/components/contact/contact-form";
import { Separator } from "@/components/ui/separator";
import { contactMetadata } from "./metadata";

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
