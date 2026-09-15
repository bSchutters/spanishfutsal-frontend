import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Next 16 a retire `next lint` : ESLint est lance directement (`eslint .`),
// il faut donc ignorer soi-meme le dossier de build et les dependances, ce
// que `next lint` faisait tout seul.
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
