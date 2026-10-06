import localFont from "next/font/local";

/**
 * La police du flocage du club, Tanker (Indian Type Foundry, distribuee
 * librement par Fontshare) : les numeros et les noms au dos, et sur la page
 * des joueurs les titres et les prix, pour que le pack parle comme le maillot.
 */
export const tanker = localFont({
  src: "../../../../public/assets/fonts/tanker/Tanker-Regular.otf",
  display: "swap",
});
