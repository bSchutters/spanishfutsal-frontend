"use client";

import { ChevronsUpDown, Globe, LogOut, SlidersHorizontal, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { seDeconnecter } from "@/hub/actions/session";

/**
 * Le pied de la barre laterale : qui est connecte, et un menu qui s'ouvre
 * dessus avec ce qui concerne le compte, le profil, les sorties et la
 * deconnexion. L'adresse n'est montree que si elle apporte quelque chose de
 * plus que le nom. Sur telephone, ce bloc n'existe pas : la page Profil
 * porte les memes sorties.
 */
export default function BlocUtilisateur({
  nom,
  email,
  lettres,
  estAdmin,
}: {
  nom: string;
  email: string;
  lettres: string;
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const montrerEmail = !email.startsWith(`${nom}@`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent"
        aria-label="Menu du compte"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          aria-hidden="true"
        >
          {lettres}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{nom}</span>
          {montrerEmail ? <span className="truncate text-[11px] text-muted-foreground">{email}</span> : null}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-52">
        <DropdownMenuLabel className="flex flex-col leading-tight">
          <span className="truncate text-sm font-medium">{nom}</span>
          <span className="truncate text-[11px] font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Pas un lien enfant : Next empeche le comportement par defaut du
              clic, et Radix ne fermerait alors jamais le menu. */}
          <DropdownMenuItem onSelect={() => router.push("/hub/profil")}>
            <UserRound aria-hidden="true" />
            Profil
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* Quitter le Hub : le site public, et l'administration pour qui y a
              droit. Une vraie navigation du navigateur, pas `router.push` : le
              site et l'administration ont chacun leur propre <html>, et Next
              rendrait leur en-tete cote client, ou un <script> ne s'execute
              jamais. */}
          {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination -- changement de racine, voir ci-dessus */}
          <DropdownMenuItem onSelect={() => window.location.assign("/")}>
            <Globe aria-hidden="true" />
            Revenir au site
          </DropdownMenuItem>
          {estAdmin ? (
            /* eslint-disable-next-line @next/next/no-location-assign-relative-destination -- racine propre a l'administration */
            <DropdownMenuItem onSelect={() => window.location.assign("/admin")}>
              <SlidersHorizontal aria-hidden="true" />
              Admin Payload
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={enCours} onSelect={() => demarrer(() => seDeconnecter())}>
          <LogOut aria-hidden="true" />
          {enCours ? "Déconnexion…" : "Se déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
