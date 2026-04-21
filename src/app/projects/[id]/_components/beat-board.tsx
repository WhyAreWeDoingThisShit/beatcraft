"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  useLiveBeats,
  useLiveCharacters,
  useLivePlaces,
  useLiveProject,
} from "@/lib/use-live";
import {
  addCustomBeat,
  detachFromMethodology,
  reorderBeat,
  resetBeatsToScaffold,
} from "@/lib/db-helpers";
import type { Beat, Character, Place } from "@/lib/db";
import { SortableBeatCard } from "./beat-card";
import { BeatDrawer } from "./beat-drawer";

const METHODOLOGY_LABEL: Record<string, string> = {
  "three-act": "3-Act Structure",
  "save-the-cat": "Save the Cat",
  "heros-journey": "Hero's Journey",
  freeform: "Freeform",
};

// ---------------------------------------------------------------------------
// Act group
// ---------------------------------------------------------------------------

function ActGroup({
  act,
  beats,
  characters,
  places,
  collapsed,
  onToggle,
  onOpenBeat,
  onAddBeat,
}: {
  act: string;
  beats: Beat[];
  characters: Character[];
  places: Place[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenBeat: (beat: Beat) => void;
  onAddBeat: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {act}
          <span className="ml-0.5 font-normal normal-case tracking-normal">
            ({beats.length})
          </span>
        </button>
        <div className="flex-1 h-px bg-border" />
        <button
          type="button"
          onClick={onAddBeat}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Add beat"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {beats.map((beat) => (
            <SortableBeatCard
              key={beat.id}
              beat={beat}
              characters={characters}
              places={places}
              onOpen={() => onOpenBeat(beat)}
            />
          ))}
          {beats.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No beats yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reset dialog
// ---------------------------------------------------------------------------

type ResetMode = "discard" | "keep" | null;

function ResetDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (mode: "discard" | "keep") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reset beats to scaffold?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will replace the scaffold beats with fresh ones. Your custom beats can be
          kept or removed.
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" onClick={() => onConfirm("discard")}>
            Discard everything & reset
          </Button>
          <Button variant="outline" onClick={() => onConfirm("keep")}>
            Keep my custom beats, reset scaffold
          </Button>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detach dialog
// ---------------------------------------------------------------------------

function DetachDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Detach from methodology?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Your project will switch to Freeform. All existing beats are kept but act
          groupings are removed.
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={onConfirm}>Detach</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main board
// ---------------------------------------------------------------------------

export function BeatBoard({ projectId }: { projectId: string }) {
  const project = useLiveProject(projectId);
  const beats = useLiveBeats(projectId);
  const characters = useLiveCharacters(projectId);
  const places = useLivePlaces(projectId);

  const [openBeat, setOpenBeat] = useState<Beat | null>(null);
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [showReset, setShowReset] = useState(false);
  const [showDetach, setShowDetach] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (!project) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isFreeform = project.methodology === "freeform";

  // Group beats by act preserving order
  const groups: { act: string; beats: Beat[] }[] = [];
  for (const beat of beats) {
    const actLabel = beat.act ?? "Beats";
    const last = groups[groups.length - 1];
    if (last?.act === actLabel) {
      last.beats.push(beat);
    } else {
      groups.push({ act: actLabel, beats: [beat] });
    }
  }

  function toggleAct(act: string) {
    setCollapsedActs((prev) => {
      const next = new Set(prev);
      next.has(act) ? next.delete(act) : next.add(act);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = beats.findIndex((b) => b.id === active.id);
    const newIndex = beats.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove([...beats], oldIndex, newIndex);
    const item = reordered[newIndex];
    const prev = reordered[newIndex - 1];
    const next = reordered[newIndex + 1];

    const newOrder = !prev
      ? next!.order - 1000
      : !next
        ? prev.order + 1000
        : (prev.order + next.order) / 2;

    reorderBeat(item.id, newOrder);
  }

  async function handleReset(mode: "discard" | "keep") {
    if (!project) return;
    setShowReset(false);
    await resetBeatsToScaffold(projectId, project.methodology, mode === "keep");
    toast.success("Beats reset to scaffold.");
  }

  async function handleDetach() {
    setShowDetach(false);
    await detachFromMethodology(projectId);
    toast.success("Detached from methodology — project is now Freeform.");
  }

  async function handleAddBeat(act: string | undefined) {
    const id = await addCustomBeat(projectId, act);
    // open the new beat
    const newBeat = beats.find((b) => b.id === id);
    if (newBeat) setOpenBeat(newBeat);
  }

  // Sync open beat with live data so edits reflect in the drawer
  const liveBeat = openBeat ? (beats.find((b) => b.id === openBeat.id) ?? null) : null;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">{project.title}</h1>
          <p className="text-xs text-muted-foreground">
            {METHODOLOGY_LABEL[project.methodology] ?? project.methodology}
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/wiki`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Wiki
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isFreeform && (
              <>
                <DropdownMenuItem onClick={() => setShowReset(true)}>
                  Reset to scaffold…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDetach(true)}>
                  Detach from methodology…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => handleAddBeat(undefined)}>
              Add beat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Board */}
      <div className="flex-1 px-6 py-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={beats.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {isFreeform ? (
              <div className="flex flex-col gap-2">
                {beats.map((beat) => (
                  <SortableBeatCard
                    key={beat.id}
                    beat={beat}
                    characters={characters}
                    places={places}
                    onOpen={() => setOpenBeat(beat)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => handleAddBeat(undefined)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add beat
                </button>
              </div>
            ) : (
              <div>
                {groups.map((g) => (
                  <ActGroup
                    key={g.act}
                    act={g.act}
                    beats={g.beats}
                    characters={characters}
                    places={places}
                    collapsed={collapsedActs.has(g.act)}
                    onToggle={() => toggleAct(g.act)}
                    onOpenBeat={setOpenBeat}
                    onAddBeat={() => handleAddBeat(g.act === "Beats" ? undefined : g.act)}
                  />
                ))}
                {groups.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <p className="text-muted-foreground">No beats yet.</p>
                    <Button variant="outline" size="sm" onClick={() => handleAddBeat(undefined)}>
                      Add first beat
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

      <BeatDrawer
        beat={liveBeat}
        characters={characters}
        places={places}
        onClose={() => setOpenBeat(null)}
      />

      <ResetDialog
        open={showReset}
        onOpenChange={setShowReset}
        onConfirm={handleReset}
      />

      <DetachDialog
        open={showDetach}
        onOpenChange={setShowDetach}
        onConfirm={handleDetach}
      />
    </div>
  );
}
