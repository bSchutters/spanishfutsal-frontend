"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formSchema } from "@/lib/schemas";
import { send } from "@/lib/email";
import { toast } from "sonner";

const topics = [
  "Sponsoring",
  "Partenariat",
  "Sportif",
  "Nous rejoindre en tant que joueur",
  "Rejoindre le staff",
  "Autre",
];

export default function Contact() {
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
            "!bg-spanish-accent  !text-spanish-bg !font-bold hover:!bg-spanish-accent-dark !transition-all",
          cancelButton: "cancel-button",
          closeButton: "close-button",
          icon: "!mr-2",
        },

        duration: 3000,
      }
    );
  }
  return (
    <div className="my-30 container mx-auto flex flex-col gap-8 md:px-0 px-6">
      <div className=" z-10 lg:py-20 py-14 lg:px-0 px-10 rounded-2xl lg:container md:max-w-2xl sm:max-w-xl max-w-md mx-auto mb-20">
        <div className="flex flex-col gap-10 items-center justify-center max-w-4xl mx-auto">
          <p className="text-4xl font-marjorie italic font-bold">
            nous contacter
          </p>
          <Separator className="mx-auto bg-spanish-bg-lighter" />
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
                    <FormLabel>Sujet *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisissez votre sujet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem
                            key={topic}
                            value={topic.replace(/\s+/g, "-")}
                          >
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
                      <FormLabel>Prénom *</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre prénom" {...field} />
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
                      <FormLabel>Nom *</FormLabel>
                      <FormControl>
                        <Input placeholder="Votre nom" {...field} />
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
                    <FormLabel>Adresse email *</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre adresse email" {...field} />
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
                    <FormLabel>Message *</FormLabel>
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
        </div>
      </div>
    </div>
  );
}
