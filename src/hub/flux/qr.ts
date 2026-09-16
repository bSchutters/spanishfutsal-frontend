import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

/**
 * Le QR code d'une page d'abonnement, avec le blason du club au centre. Le
 * niveau de correction le plus eleve laisse recouvrir un tiers du code sans
 * gener la lecture ; le blason en prend environ un cinquieme.
 */

const COULEUR_SOMBRE = "#122642";
const COULEUR_CLAIRE = "#ffffff";
const LOGO = path.join(process.cwd(), "public", "assets", "images", "svg", "logo-asturiana.svg");

export async function qrPng(url: string, taille = 1024): Promise<Buffer> {
  const code = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "H",
    width: taille,
    margin: 2,
    color: { dark: COULEUR_SOMBRE, light: COULEUR_CLAIRE },
  });

  const tailleLogo = Math.round(taille * 0.2);
  const tailleFond = Math.round(taille * 0.26);
  const logo = await sharp(await readFile(LOGO)).resize(tailleLogo, tailleLogo, { fit: "inside" }).png().toBuffer();
  const fond = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tailleFond}" height="${tailleFond}"><circle cx="${tailleFond / 2}" cy="${tailleFond / 2}" r="${tailleFond / 2}" fill="${COULEUR_CLAIRE}"/></svg>`,
  );

  return sharp(code)
    .composite([{ input: fond, gravity: "centre" }, { input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

export async function qrSvg(url: string): Promise<string> {
  const code = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: COULEUR_SOMBRE, light: COULEUR_CLAIRE },
  });
  const logo = await readFile(LOGO, "utf8");
  const donnees = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;

  // Le SVG de qrcode a une viewBox carree en modules : on place le blason en
  // unites de cette viewBox, au centre.
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(code);
  const cote = viewBox ? Number(viewBox[1]) : 100;
  const rayon = cote * 0.13;
  const logoCote = cote * 0.2;
  const centre = cote / 2;
  const incrustation =
    `<circle cx="${centre}" cy="${centre}" r="${rayon}" fill="${COULEUR_CLAIRE}"/>` +
    `<image href="${donnees}" x="${centre - logoCote / 2}" y="${centre - logoCote / 2}" width="${logoCote}" height="${logoCote}"/>`;
  return code.replace("</svg>", `${incrustation}</svg>`);
}
