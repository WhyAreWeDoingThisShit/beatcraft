"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLiveBeats, useLiveCharacters, useLivePlaces } from "@/lib/use-live";
import type { Character, Place } from "@/lib/db";
import {
  CharacterDrawer,
  CHARACTER_COLORS,
  characterInitials,
} from "./character-drawer";
import { PlaceDrawer } from "./place-drawer";

type Tab = "characters" | "places";

function CharacterCard({
  character,
  onClick,
}: {
  character: Character;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-border/80 hover:shadow-sm"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
        style={{ backgroundColor: character.color ?? "#6366f1" }}
      >
        {characterInitials(character.name)}
      </div>
      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-medium text-foreground">{character.name}</p>
        {character.role && (
          <p className="truncate text-xs text-muted-foreground">{character.role}</p>
        )}
      </div>
    </button>
  );
}

function PlaceCard({
  place,
  onClick,
}: {
  place: Place;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-border/80 hover:shadow-sm"
    >
      <p className="truncate text-sm font-medium text-foreground">{place.name}</p>
      {place.kind && (
        <p className="truncate text-xs text-muted-foreground">{place.kind}</p>
      )}
      {place.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
          {place.description}
        </p>
      )}
    </button>
  );
}

export function WikiClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const beats = useLiveBeats(projectId);
  const characters = useLiveCharacters(projectId);
  const places = useLivePlaces(projectId);

  const [tab, setTab] = useState<Tab>("characters");
  const [search, setSearch] = useState("");
  const [openChar, setOpenChar] = useState<Character | "new" | null>(null);
  const [openPlace, setOpenPlace] = useState<Place | "new" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = target.matches("input, textarea, [contenteditable]");

      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === "n" && !inField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (tab === "characters") setOpenChar("new");
        else setOpenPlace("new");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  const filteredChars = characters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPlaces = places.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleJumpToBeat(beatId: string) {
    router.push(`/projects/${projectId}#beat-${beatId}`);
  }

  function linkedBeatsFor(
    entity: Character | Place,
    type: "character" | "place",
  ) {
    return beats.filter((b) =>
      type === "character"
        ? b.linkedCharacterIds.includes(entity.id)
        : b.linkedPlaceIds.includes(entity.id),
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Board
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground">Wiki</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search… (/)"
              className="h-8 w-48 rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (tab === "characters") setOpenChar("new");
              else setOpenPlace("new");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New <span className="sr-only">{tab === "characters" ? "character" : "place"}</span>
            <kbd className="ml-0.5 rounded bg-muted px-1 font-mono text-[10px]">N</kbd>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 px-6 py-5">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
        >
          <TabsList className="mb-5">
            <TabsTrigger value="characters">
              Characters
              {characters.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {characters.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="places">
              Places
              {places.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {places.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters">
            {filteredChars.length > 0 ? (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  contentVisibility: "auto",
                }}
              >
                {filteredChars.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    onClick={() => setOpenChar(c)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                label={
                  search
                    ? `No characters match "${search}"`
                    : "No characters yet. Press N to add one."
                }
                onAdd={search ? undefined : () => setOpenChar("new")}
              />
            )}
          </TabsContent>

          <TabsContent value="places">
            {filteredPlaces.length > 0 ? (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  contentVisibility: "auto",
                }}
              >
                {filteredPlaces.map((p) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    onClick={() => setOpenPlace(p)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                label={
                  search
                    ? `No places match "${search}"`
                    : "No places yet. Press N to add one."
                }
                onAdd={search ? undefined : () => setOpenPlace("new")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CharacterDrawer
        character={openChar}
        projectId={projectId}
        linkedBeats={
          openChar && openChar !== "new"
            ? linkedBeatsFor(openChar, "character")
            : []
        }
        onClose={() => setOpenChar(null)}
        onJumpToBeat={handleJumpToBeat}
      />

      <PlaceDrawer
        place={openPlace}
        projectId={projectId}
        linkedBeats={
          openPlace && openPlace !== "new"
            ? linkedBeatsFor(openPlace, "place")
            : []
        }
        onClose={() => setOpenPlace(null)}
        onJumpToBeat={handleJumpToBeat}
      />
    </div>
  );
}

function EmptyState({
  label,
  onAdd,
}: {
  label: string;
  onAdd?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add first
        </button>
      )}
    </div>
  );
}
