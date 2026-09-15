"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Les toasts du Hub. Sonner en direct, theme sombre fixe : le Hub n'a pas de
 * fournisseur de theme, contrairement au site, et n'en a pas besoin.
 */
export default function ToasterHub() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
    />
  );
}
