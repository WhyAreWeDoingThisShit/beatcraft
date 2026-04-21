"use client";

import { CopyPlus } from "lucide-react";
import type { Character, Place } from "@/lib/db";
import { CharacterIcon, PlaceIcon } from "./entity-icon";
import { EntityPicker } from "./entity-picker";

interface CastStripProps {
  characters: Character[];
  places: Place[];
  linkedCharacterIds: string[];
  linkedPlaceIds: string[];
  variant: "compact" | "full";
  // full variant handlers
  onAddCharacter?: (id: string) => void;
  onRemoveCharacter?: (id: string) => void;
  onAddPlace?: (id: string) => void;
  onRemovePlace?: (id: string) => void;
  onOpenCharacter?: (c: Character) => void;
  onOpenPlace?: (p: Place) => void;
  onSameAsPrevious?: () => void;
  hasPrevious?: boolean;
  onCreateCharacter?: () => void;
  onCreatePlace?: () => void;
}

export function CastStrip({
  characters,
  places,
  linkedCharacterIds,
  linkedPlaceIds,
  variant,
  onAddCharacter,
  onRemoveCharacter,
  onAddPlace,
  onRemovePlace,
  onOpenCharacter,
  onOpenPlace,
  onSameAsPrevious,
  hasPrevious,
  onCreateCharacter,
  onCreatePlace,
}: CastStripProps) {
  const linkedChars = characters.filter((c) => linkedCharacterIds.includes(c.id));
  const linkedPlaces = places.filter((p) => linkedPlaceIds.includes(p.id));

  const showCast = linkedChars.length > 0 || variant === "full";
  const showSetting = linkedPlaces.length > 0 || variant === "full";

  if (!showCast && !showSetting) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {variant === "full" && hasPrevious && onSameAsPrevious && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSameAsPrevious}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <CopyPlus className="h-3 w-3" />
            Same as previous scene
          </button>
        </div>
      )}

      {showCast && (
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Cast
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {linkedChars.map((c) => (
              <CharacterIcon
                key={c.id}
                character={c}
                size="sm"
                onClick={variant === "full" && onOpenCharacter ? () => onOpenCharacter(c) : undefined}
                showRemove={variant === "full"}
                onRemove={() => onRemoveCharacter?.(c.id)}
              />
            ))}
            {variant === "full" && (
              <EntityPicker
                entities={characters}
                selectedIds={linkedCharacterIds}
                kind="character"
                onSelect={(id) => onAddCharacter?.(id)}
                onCreateNew={() => onCreateCharacter?.()}
              />
            )}
          </div>
        </div>
      )}

      {showSetting && (
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Setting
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {linkedPlaces.map((p) => (
              <PlaceIcon
                key={p.id}
                place={p}
                size="sm"
                onClick={variant === "full" && onOpenPlace ? () => onOpenPlace(p) : undefined}
                showRemove={variant === "full"}
                onRemove={() => onRemovePlace?.(p.id)}
              />
            ))}
            {variant === "full" && (
              <EntityPicker
                entities={places}
                selectedIds={linkedPlaceIds}
                kind="place"
                onSelect={(id) => onAddPlace?.(id)}
                onCreateNew={() => onCreatePlace?.()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
