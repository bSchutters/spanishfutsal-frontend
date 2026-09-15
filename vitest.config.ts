import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Les tests unitaires du Hub. Ils tournent sans base ni serveur : les regles
 * de droits, les limites et les calculs sont des fonctions pures. Les memes
 * alias que tsconfig, pour que `@/hub/droits` se resolve ici aussi.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@app": fileURLToPath(new URL("./app", import.meta.url)),
      "@payload-config": fileURLToPath(new URL("./payload.config.ts", import.meta.url)),
    },
  },
});
