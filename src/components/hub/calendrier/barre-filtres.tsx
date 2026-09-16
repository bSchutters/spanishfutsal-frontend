"use client";

import { ListFilter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { References } from "@/hub/calendrier/donnees";
import { Pastille } from "@/components/hub/mise-en-page";
import { FILTRES_VIDES, filtresActifs, type Filtres } from "./filtres";

const TOUS = "tous";

/** Les filtres combinables : types et flux a cocher, responsable, les miens. */
export default function BarreFiltres({
  references,
  filtres,
  onChange,
}: {
  references: References;
  filtres: Filtres;
  onChange: (filtres: Filtres) => void;
}) {
  const actifs = filtresActifs(filtres);
  const basculer = (liste: number[], id: number) =>
    liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="hubSecondary" size="sm">
            <ListFilter aria-hidden="true" />
            Filtres
            {actifs > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {actifs}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Types</legend>
              <div className="flex flex-col gap-2">
                {references.types.map((type) => (
                  <label key={type.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtres.typeIds.includes(type.id)}
                      onCheckedChange={() => onChange({ ...filtres, typeIds: basculer(filtres.typeIds, type.id) })}
                    />
                    <Pastille couleur={type.couleur} />
                    {type.nom}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Flux</legend>
              <div className="flex flex-col gap-2">
                {references.flux.map((flux) => (
                  <label key={flux.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filtres.fluxIds.includes(flux.id)}
                      onCheckedChange={() => onChange({ ...filtres, fluxIds: basculer(filtres.fluxIds, flux.id) })}
                    />
                    <Pastille couleur={flux.couleur} />
                    {flux.nom}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-4 flex flex-col gap-2">
              <Label htmlFor="filtre-responsable" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Responsable
              </Label>
              <Select
                value={filtres.responsableId === null ? TOUS : String(filtres.responsableId)}
                onValueChange={(v) => onChange({ ...filtres, responsableId: v === TOUS ? null : Number(v) })}
              >
                <SelectTrigger id="filtre-responsable" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Tous</SelectItem>
                  {references.responsables.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              Mes événements
              <Switch checked={filtres.lesMiens} onCheckedChange={(v) => onChange({ ...filtres, lesMiens: v })} />
            </label>
          </div>
          {actifs > 0 ? (
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(FILTRES_VIDES)}>
                <X aria-hidden="true" />
                Tout effacer
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={filtres.lesMiens} onCheckedChange={(v) => onChange({ ...filtres, lesMiens: v })} />
        Mes événements
      </label>
    </div>
  );
}
