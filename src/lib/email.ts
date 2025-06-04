"use server";

import { z } from "zod";
import { formSchema } from "./schemas";
import { Resend } from "resend";
import { EmailTemplate } from "@/components/ui/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

export const send = async (emailFormData: z.infer<typeof formSchema>) => {
  try {
    const { error } = await resend.emails.send({
      from: `Formulaire de contact Spanish <${process.env.RESEND_FROM_EMAIL}>`,
      to: "bryan021@hotmail.be",
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
