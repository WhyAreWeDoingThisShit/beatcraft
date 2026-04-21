"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Character, Place } from "@/lib/db";
import { CharacterIcon, PlaceIcon } from "./entity-icon";

interface EntityPickerProps<T extends Character | Place> {
  entities: T[];
  selectedIds: string[];
  kind: "character" | "place";
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function EntityPicker<T extends Character | Place>({
  entities,
  selectedIds,
  kind,
  onSelect,
  onCreateNew,
}: EntityPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = entities.filter(
    (e) => !selectedIds.includes(e.id),
  );
  const filtered = available.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        aria-label={`Add ${kind}`}
      >
        <Plus className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${kind}s…`}
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                  onClick={() => {
                    onSelect(entity.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {kind === "character" ? (
                    <CharacterIcon character={entity as Character} size="sm" />
                  ) : (
                    <PlaceIcon place={entity as Place} size="sm" />
                  )}
                  {entity.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && available.length > 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No results</li>
            )}
            {available.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">All added</li>
            )}
          </ul>

          <div className="border-t py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => {
                setOpen(false);
                setSearch("");
                onCreateNew();
              }}
            >
              <Plus className="h-3 w-3" />
              Create new {kind}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
