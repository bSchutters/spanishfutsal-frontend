import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

/**
 * Politique de securite du contenu. `'unsafe-inline'` sur les scripts est
 * inevitable ici : Next diffuse la charge utile des composants serveur dans
 * des balises <script> en ligne. La contourner demanderait un nonce, donc un
 * middleware, donc le rendu dynamique de toutes les pages, alors que les
 * vingt-trois sont aujourd'hui statiques. Le reste de la politique est ferme,
 * et `frame-ancestors`, `base-uri`, `form-action` et `object-src` couvrent des
 * attaques que l'echappement de React ne couvre pas.
 */
// En developpement, Next enveloppe chaque module dans un `eval` pour le
// rechargement a chaud. Sans cette permission, l'hydratation echoue des la
// premiere page : le compte a rebours reste fige, les menus ne s'ouvrent plus.
// La production, elle, ne compile aucun `eval`.
const EN_DEV = process.env.NODE_ENV !== "production";

const CSP_PUBLIC = [
  "default-src 'self'",
  // youtube.com sert le script de l'API IFrame, qui permet de masquer les
  // commandes natives du lecteur et de piloter la lecture depuis les notres.
  // C'est une ouverture plus large que `frame-src` : ce script s'execute dans
  // notre origine, la ou un cadre reste isole.
  `script-src 'self' 'unsafe-inline' https://www.youtube.com${EN_DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // i.ytimg.com sert les images du lecteur une fois qu'il tourne. La vignette
  // de la facade, elle, passe par le proxy d'images du site : aucune requete
  // ne part chez Google avant que le visiteur ne lance la diffusion.
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self'",
  "connect-src 'self'",
  // Seule ouverture de la politique : le lecteur du match en direct. Le
  // domaine sans cookie de YouTube, et lui seul, peut donc etre place dans un
  // cadre. Rien n'y est charge tant que le visiteur n'a pas clique.
  "frame-src https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// L'admin Payload embarque son propre editeur et ses propres travailleurs :
// lui imposer la politique publique le casserait. On garde ce qui l'empeche
// d'etre affiche dans le cadre d'un autre site, le reste passe.
const CSP_ADMIN = "frame-ancestors 'self'";

const ENTETES_COMMUNS = [
  // Empeche le navigateur de deviner un type MIME et d'executer en script
  // un fichier servi comme autre chose.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // N'envoie l'adresse complete de la page qu'aux pages du meme site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le site ne demande ni camera, ni micro, ni position : on le declare.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Toutes les pages sauf l'admin.
        source: "/((?!admin).*)",
        headers: [
          ...ENTETES_COMMUNS,
          { key: "Content-Security-Policy", value: CSP_PUBLIC },
          // Redondant avec `frame-ancestors` pour les navigateurs recents, mais il
          // reste la seule protection comprise par les tres anciens. Il ne coute rien.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/admin/:chemin*",
        headers: [
          ...ENTETES_COMMUNS,
          { key: "Content-Security-Policy", value: CSP_ADMIN },
        ],
      },
    ];
  },
  devIndicators: false,
  images: {
    // Liste par defaut de Next, plus 2560 et 3072. Entre 2048 et 3840 il n y
    // avait aucun palier : un portable de 1039 px en densite 2 demande 2078 px
    // et se voyait servir la variante 3840. Les deux bannieres plein ecran
    // (accueil et /a-propos) sont concernees, elles pesaient 291 Ko.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3072, 3840],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "strapi.sbryan.studio",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        // Vignettes des diffusions. Elles passent par le proxy d'images plutot
        // que d'etre chargees directement : la page n'appelle ainsi aucun
        // serveur de Google avant que le visiteur ne lance le lecteur.
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

export default withPayload(nextConfig);
