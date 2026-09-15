"use client";

import dynamic from "next/dynamic";

/**
 * Le formulaire, importe a part.
 *
 * Le menu precharge chaque page, et Next telecharge avec elle les modules
 * clients que sa page reference. Un `dynamic` pose dans le composant serveur
 * ne change rien a cela : c'est le formulaire lui-meme qui reste reference.
 * Ici, la page ne reference que ce petit composant ; le formulaire
 * (react-hook-form, zod 4 et ses traductions, sonner : 106 Ko compresses)
 * n'est demande qu'au moment ou il s'affiche, donc sur la page contact
 * seulement. Il reste rendu cote serveur.
 */
const ContactForm = dynamic(() => import("./contact-form"));

export default function ContactFormDiffere() {
  return <ContactForm />;
}
