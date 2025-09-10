"use server";

import { EmailTemplate } from "@/components/ui/email-template";
import { Resend } from "resend";
import { z } from "zod";
import { formSchema } from "./schemas";

const resend = new Resend(process.env.RESEND_API_KEY);

export const send = async (emailFormData: z.infer<typeof formSchema>) => {
  try {
    const { error } = await resend.emails.send({
      from: `Formulaire de contact UD Asturiana <${process.env.RESEND_FROM_EMAIL}>`,
      to: "contact@udasturiana.be",
      subject: `Sujet: ${emailFormData.topic}`,
      react: await EmailTemplate({
        firstName: emailFormData.firstName,
        email: emailFormData.email,
        topic: emailFormData.topic,
        message: emailFormData.message,
        lastName: emailFormData.lastName,
      }),
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    throw error;
  }
};
