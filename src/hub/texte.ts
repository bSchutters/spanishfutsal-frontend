import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

/**
 * Le texte enrichi des evenements est stocke au format Lexical, l'editeur de
 * Payload. Le Hub, lui, saisit du texte simple sur un telephone : il ecrit
 * des paragraphes Lexical, et relit tout Lexical en texte brut, y compris ce
 * qui aurait ete mis en forme depuis l'administration.
 */

type Etat = SerializedEditorState;

/** Des lignes de texte en paragraphes Lexical. Vide : null, pour ne rien stocker. */
export function texteVersLexical(texte: string | null | undefined): Etat | null {
  const propre = (texte ?? "").replace(/\r\n/g, "\n").trim();
  if (!propre) return null;
  const paragraphes = propre.split(/\n/).map((ligne) => ({
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: null,
    textFormat: 0,
    textStyle: "",
    children: ligne
      ? [{ type: "text", version: 1, text: ligne, format: 0, detail: 0, mode: "normal", style: "" }]
      : [],
  }));
  return {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: paragraphes,
    },
  } as unknown as Etat;
}

/** Un etat Lexical en texte brut, une ligne par paragraphe. */
export function lexicalVersTexte(etat: unknown): string {
  if (!etat || typeof etat !== "object" || !("root" in etat)) return "";
  try {
    return convertLexicalToPlaintext({ data: etat as Etat }).trim();
  } catch {
    return "";
  }
}
