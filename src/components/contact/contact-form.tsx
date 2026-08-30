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
import { formSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const topics = [
  "Sponsoring",
  "Partenariat",
  "Sportif",
  "Nous rejoindre en tant que joueur",
  "Rejoindre le staff",
  "Autre",
];

/**
 * Ilot client : react-hook-form, zod et sonner ne sont charges que par ce
 * composant. La page qui l'accueille reste un composant serveur, ce qui lui
 * rend son export `metadata`.
 */
export default function ContactForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    },
  });
  const router = useRouter();

  function onSubmit(values: z.infer<typeof formSchema>) {
    send(values);
    form.reset();

    toast.success(
      <div className="flex flex-col">
        <p className="description">
          Nous avons bien reçu votre message et nous vous répondrons dans les
          plus brefs délais.
        </p>
      </div>,
      {
        classNames: {
          toast: "!bg-spanish-bg-dark !text-white !border-spanish-bg-light",
          title: "title",
          description: "description",
          actionButton:
            "!bg-spanish-accent  !text-spanish-bg !font-bold hover:!bg-spanish-accent-dark !transition-colors",
          cancelButton: "cancel-button",
          closeButton: "close-button",
          icon: "!mr-2",
        },

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
                  {topics.map((topic) => (
                    <SelectItem key={topic} value={topic.replace(/\s+/g, "-")}>
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

        <Button type="submit" className="self-end">
          Envoyer
        </Button>
      </form>
    </Form>
  );
}
