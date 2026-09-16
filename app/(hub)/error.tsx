"use client";

import { Button } from "@/components/ui/button";

/** Une page du Hub a plante : on le dit, avec le message, et on propose de reessayer. */
export default function ErreurHub({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
        <h1 className="text-base font-semibold">Cette page n&apos;a pas pu s&apos;afficher</h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">{error.message || "Erreur inconnue."}</p>
        {error.digest ? <p className="mt-1 text-xs text-muted-foreground">Référence : {error.digest}</p> : null}
        <div className="mt-4">
          <Button variant="hub" onClick={reset}>
            Réessayer
          </Button>
        </div>
      </div>
    </main>
  );
}
