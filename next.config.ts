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
const CSP_PUBLIC = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
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
    ],
  },
};

export default withPayload(nextConfig);
