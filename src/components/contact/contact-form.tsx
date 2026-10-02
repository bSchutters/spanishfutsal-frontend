"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { send } from "@/lib/email";
import { formSchema, SUJETS, type FormValues } from "@/lib/schemas";
// Le schema vient de `zod/mini`, sans methode `parse` : le resolver zod de
// react-hook-form ne sait pas s'en servir, celui de Standard Schema si.
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const CLASSES_TOAST = {
  toast: "!bg-spanish-bg-dark !text-white !border-spanish-bg-light",
  title: "title",
  description: "description",
  actionButton:
    "!bg-spanish-accent  !text-spanish-bg !font-bold hover:!bg-spanish-accent-dark !transition-colors",
  cancelButton: "cancel-button",
  closeButton: "close-button",
  icon: "!mr-2",
};

/**
 * Ilot client : react-hook-form, zod et sonner ne sont charges que par ce
 * composant. La page qui l'accueille reste un composant serveur, ce qui lui
 * rend son export `metadata`.
 */
export default function ContactForm() {
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      topic: "",
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    },
  });
  const router = useRouter();

  /**
   * Le succes ne s'annonce qu'une fois le message parti. En cas d'echec, la
   * saisie reste en place : le visiteur reessaie sans tout retaper.
   */
  async function onSubmit(values: FormValues) {
    const resultat = await send(values).catch(() => ({
      ok: false as const,
      erreur: "Votre message n'est pas parti. Réessayez dans un instant.",
    }));

    if (!resultat.ok) {
      toast.error(resultat.erreur, { classNames: CLASSES_TOAST, duration: 6000 });
      return;
    }

    form.reset();
    toast.success(
      <div className="flex flex-col">
        <p className="description">
          Nous avons bien reçu votre message et nous vous répondrons dans les
          plus brefs délais.
        </p>
      </div>,
      {
        classNames: CLASSES_TOAST,
        duration: 3000,
      }
    );
    router.push("/");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 w-full flex flex-col"
      >
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sujet</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger aria-label="Sujet" className="w-full">
                    <SelectValue placeholder="Choisissez votre sujet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUJETS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Votre prénom"
                    autoComplete="given-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Votre nom"
                    autoComplete="family-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Votre adresse email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dites nous ce que vous avez en tête..."
                  {...field}
                  className="min-h-32"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="self-end"
        >
          {form.formState.isSubmitting ? "Envoi…" : "Envoyer"}
        </Button>
      </form>
    </Form>
  );
}
