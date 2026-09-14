/**
 * Les logos de reseaux sociaux, tels que lucide les dessinait.
 *
 * lucide 1.0 a retire toutes ses icones de marques (Facebook, Instagram,
 * LinkedIn, X, YouTube). Plutot que d'ajouter une bibliotheque pour cinq
 * traces, on les recree ici avec `createLucideIcon`, a partir des traces de
 * lucide 0.577 (licence ISC) : memes props, meme rendu, meme trait de 2 px.
 */

import { createLucideIcon } from "lucide-react";

export const Facebook = createLucideIcon("facebook", [
  [
    "path",
    { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", key: "1" },
  ],
]);

export const Instagram = createLucideIcon("instagram", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "1" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "2" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "3" }],
]);

export const Linkedin = createLucideIcon("linkedin", [
  [
    "path",
    { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z", key: "1" },
  ],
  ["rect", { width: "4", height: "12", x: "2", y: "9", key: "2" }],
  ["circle", { cx: "4", cy: "4", r: "2", key: "3" }],
]);

export const Twitter = createLucideIcon("twitter", [
  [
    "path",
    {
      d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
      key: "1",
    },
  ],
]);

export const Youtube = createLucideIcon("youtube", [
  [
    "path",
    {
      d: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17",
      key: "1",
    },
  ],
  ["path", { d: "m10 15 5-3-5-3z", key: "2" }],
]);
