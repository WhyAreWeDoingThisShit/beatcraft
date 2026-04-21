"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Character, Place } from "@/lib/db";

export function characterInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface EntityIconProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}

export function EntityIcon({
  name,
  color = "#6366f1",
  size = "md",
  onClick,
  showRemove,
  onRemove,
}: EntityIconProps) {
  const sizeClass =
    size === "sm"
      ? "h-5 w-5 text-[9px]"
      : size === "lg"
        ? "h-8 w-8 text-xs"
        : "h-6 w-6 text-[10px]";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="relative shrink-0 group/icon">
              <div
                className={`${sizeClass} flex items-center justify-center rounded-full font-bold text-white ${onClick ? "cursor-pointer hover:brightness-110" : ""}`}
                style={{ backgroundColor: color }}
                onClick={onClick}
              >
                {characterInitials(name)}
              </div>
              {showRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.();
                  }}
                  className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] group-hover/icon:flex"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              )}
            </div>
          }
        />
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CharacterIcon({
  character,
  size,
  onClick,
  showRemove,
  onRemove,
}: {
  character: Character;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}) {
  return (
    <EntityIcon
      name={character.name}
      color={character.color ?? "#6366f1"}
      size={size}
      onClick={onClick}
      showRemove={showRemove}
      onRemove={onRemove}
    />
  );
}

export function PlaceIcon({
  place,
  size,
  onClick,
  showRemove,
  onRemove,
}: {
  place: Place;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}) {
  return (
    <EntityIcon
      name={place.name}
      color="#64748b"
      size={size}
      onClick={onClick}
      showRemove={showRemove}
      onRemove={onRemove}
    />
  );
}
