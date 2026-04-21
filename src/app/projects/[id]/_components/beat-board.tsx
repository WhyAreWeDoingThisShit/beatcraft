"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, BarChart2, Settings, FileJson } from "lucide-react";
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
  getSceneCount,
  listBeats,
  reorderBeat,
  resetBeatsToScaffold,
} from "@/lib/db-helpers";
import { exportProject } from "@/lib/io";
import type { Beat, Character, Place } from "@/lib/db";
import { SortableBeatCard } from "./beat-card";

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
  projectId,
  collapsed,
  onToggle,
  onOpenBeat,
  onAddBeat,
}: {
  act: string;
  beats: Beat[];
  characters: Character[];
  places: Place[];
  projectId: string;
  collapsed: boolean;
  onToggle: () => void;
  onOpenBeat: (beat: Beat) => void;
  onAddBeat: () => void;
}) {
  const headingId = `act-${act.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="mb-4" role="region" aria-labelledby={headingId}>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          id={headingId}
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
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
          aria-label={`Add beat to ${act}`}
        >
          <Plus className="h-3 w-3" aria-hidden />
          Add
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2" role="list" aria-label={`${act} beats`}>
          {beats.map((beat) => (
            <SortableBeatCard
              key={beat.id}
              beat={beat}
              characters={characters}
              places={places}
              projectId={projectId}
              onOpen={() => onOpenBeat(beat)}
            />
          ))}
          {beats.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No beats in this act yet.{" "}
              <button
                type="button"
                onClick={onAddBeat}
                className="text-primary underline-offset-2 hover:underline"
              >
                Add one
              </button>
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

function ResetDialog({
  open,
  onOpenChange,
  onConfirm,
  counts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (mode: "discard" | "keep") => void;
  counts: { discard: { beatCount: number; sceneCount: number } | null; keep: { beatCount: number; sceneCount: number } | null };
}) {
  function countLabel(c: { beatCount: number; sceneCount: number } | null) {
    if (!c) return "";
    const parts: string[] = [];
    if (c.beatCount > 0) parts.push(`${c.beatCount} beat${c.beatCount !== 1 ? "s" : ""}`);
    if (c.sceneCount > 0) parts.push(`${c.sceneCount} scene${c.sceneCount !== 1 ? "s" : ""}`);
    return parts.length > 0 ? ` (${parts.join(" and ")})` : "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reset beats to scaffold?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Scaffold beats will be replaced with fresh ones. Your custom beats can be kept or removed.
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" onClick={() => onConfirm("discard")}>
            Discard everything &amp; reset{countLabel(counts.discard)}
          </Button>
          <Button variant="outline" onClick={() => onConfirm("keep")}>
            Keep custom beats, reset scaffold{countLabel(counts.keep)}
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
          Your project will switch to Freeform. All existing beats are kept but act groupings are removed.
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
  const router = useRouter();
  const project = useLiveProject(projectId);
  const beats = useLiveBeats(projectId);
  const characters = useLiveCharacters(projectId);
  const places = useLivePlaces(projectId);

  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [showReset, setShowReset] = useState(false);
  const [showDetach, setShowDetach] = useState(false);
  const [resetCounts, setResetCounts] = useState<{
    discard: { beatCount: number; sceneCount: number } | null;
    keep: { beatCount: number; sceneCount: number } | null;
  }>({ discard: null, keep: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // `n` shortcut — add a new beat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = target.matches("input, textarea, select, [contenteditable]");
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        handleAddBeat(undefined);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!project) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isFreeform = project.methodology === "freeform";

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

  async function computeResetCounts() {
    const existing = await listBeats(projectId);
    const nonCustom = existing.filter((b) => !b.isCustom);
    const all = existing;

    async function sumScenes(list: Beat[]) {
      let count = 0;
      for (const b of list) count += await getSceneCount(b.id);
      return count;
    }

    const [discardScenes, keepScenes] = await Promise.all([
      sumScenes(all),
      sumScenes(nonCustom),
    ]);

    setResetCounts({
      discard: { beatCount: all.length, sceneCount: discardScenes },
      keep: { beatCount: nonCustom.length, sceneCount: keepScenes },
    });
  }

  async function handleOpenReset() {
    setShowReset(true);
    await computeResetCounts();
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
    toast.success("Detached — project is now Freeform.");
  }

  async function handleAddBeat(act: string | undefined) {
    const id = await addCustomBeat(projectId, act);
    router.push(`/projects/${projectId}/beats/${id}`);
  }

  function handleOpenBeat(beat: Beat) {
    router.push(`/projects/${projectId}/beats/${beat.id}`);
  }

  async function handleExportJSON() {
    try {
      const blob = await exportProject(projectId);
      const slug = (project?.title ?? "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.bosanquet.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed.");
    }
  }

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
          href={`/projects/${projectId}/progress`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="View progress"
        >
          <BarChart2 className="h-3.5 w-3.5" aria-hidden />
          Progress
        </Link>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Export project as JSON"
        >
          <FileJson className="h-3.5 w-3.5" aria-hidden />
          Export
        </button>

        <Link
          href={`/projects/${projectId}/settings`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Project settings"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden />
          Settings
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options" />}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isFreeform && (
              <>
                <DropdownMenuItem onClick={handleOpenReset}>
                  Reset to scaffold…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDetach(true)}>
                  Detach from methodology…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => handleAddBeat(undefined)}>
              Add beat <kbd className="ml-auto text-[10px] text-muted-foreground">N</kbd>
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
              <div className="flex flex-col gap-2" role="list" aria-label="Beats">
                {beats.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <p className="text-muted-foreground">No beats yet. Add one to get started.</p>
                    <Button onClick={() => handleAddBeat(undefined)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add first beat
                      <kbd className="ml-1 rounded bg-primary-foreground/10 px-1 font-mono text-[10px]">N</kbd>
                    </Button>
                  </div>
                ) : (
                  <>
                    {beats.map((beat) => (
                      <SortableBeatCard
                        key={beat.id}
                        beat={beat}
                        characters={characters}
                        places={places}
                        projectId={projectId}
                        onOpen={() => handleOpenBeat(beat)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddBeat(undefined)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      aria-label="Add beat"
                    >
                      <Plus className="h-4 w-4" />
                      Add beat
                    </button>
                  </>
                )}
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
                    projectId={projectId}
                    collapsed={collapsedActs.has(g.act)}
                    onToggle={() => toggleAct(g.act)}
                    onOpenBeat={handleOpenBeat}
                    onAddBeat={() => handleAddBeat(g.act === "Beats" ? undefined : g.act)}
                  />
                ))}
                {groups.length === 0 && (
                  <div className="flex flex-col items-center gap-4 py-20 text-center">
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

      <ResetDialog
        open={showReset}
        onOpenChange={setShowReset}
        onConfirm={handleReset}
        counts={resetCounts}
      />

      <DetachDialog
        open={showDetach}
        onOpenChange={setShowDetach}
        onConfirm={handleDetach}
      />
    </div>
  );
}
