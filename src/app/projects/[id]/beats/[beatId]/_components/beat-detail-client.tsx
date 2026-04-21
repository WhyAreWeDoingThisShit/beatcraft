"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, GripVertical, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDndMonitor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import {
  useLiveBeats,
  useLiveBeatStatus,
  useLiveCharacters,
  useLivePlaces,
  useLiveProject,
  useLiveScenes,
} from "@/lib/use-live";
import {
  addCustomBeat,
  createScene,
  moveSceneToBeat,
  reorderScene,
  setBeatStatus,
  updateBeat,
  updateScene,
} from "@/lib/db-helpers";
import type { Beat, BeatStatus, Character, Place, Scene, SceneStatus } from "@/lib/db";
import { CastStrip } from "../../../_components/cast-strip";
import { SceneEditorDrawer } from "../../../_components/scene-editor-drawer";

// ---------------------------------------------------------------------------
// Status chip (scene cards)
// ---------------------------------------------------------------------------

const STATUS_NEXT: Record<SceneStatus, SceneStatus> = {
  untouched: "drafted",
  drafted: "done",
  done: "skipped",
  skipped: "untouched",
};

const STATUS_LABEL: Record<SceneStatus, string> = {
  untouched: "Untouched",
  drafted: "Drafted",
  done: "Done",
  skipped: "Skipped",
};

function SceneStatusChip({
  status,
  onClick,
}: {
  status: SceneStatus;
  onClick: (e: React.MouseEvent) => void;
}) {
  if (status === "skipped") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Skipped"
        className="inline-flex h-5 items-center px-1 transition-opacity hover:opacity-70"
      >
        <X className="h-3.5 w-3.5" style={{ color: "#7A2E2E" }} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold transition-colors",
        status === "untouched" && "bg-[#5C4F42]/15 text-[#5C4F42]/70",
        status === "drafted" && "bg-[#8B6F47] text-[#F2E8D5]",
        status === "done" && "bg-[#52796F] text-[#F2E8D5]",
      )}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Beat status options (beat detail header)
// ---------------------------------------------------------------------------

const BEAT_STATUS_OPTIONS: { value: BeatStatus; label: string }[] = [
  { value: "untouched", label: "Untouched" },
  { value: "drafted", label: "Drafted" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

// ---------------------------------------------------------------------------
// Scene card
// ---------------------------------------------------------------------------

function SceneCard({
  scene,
  characters,
  places,
  onClick,
  dragHandleProps,
}: {
  scene: Scene;
  characters: Character[];
  places: Place[];
  onClick: () => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const [title, setTitle] = useState(scene.title);
  const titleSaved = useRef(scene.title);

  if (scene.title !== titleSaved.current) {
    setTitle(scene.title);
    titleSaved.current = scene.title;
  }

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== scene.title) {
      updateScene(scene.id, { title: trimmed });
      titleSaved.current = trimmed;
    } else {
      setTitle(scene.title);
    }
  }

  function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    updateScene(scene.id, { status: STATUS_NEXT[scene.status] });
  }

  const preview = scene.body.slice(0, 120);
  const isSkipped = scene.status === "skipped";

  return (
    <div
      role="article"
      aria-label={`Scene: ${scene.title}`}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-border/80 hover:shadow-sm",
        isSkipped && "opacity-70",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 truncate bg-transparent font-medium text-foreground outline-none"
        />
        <SceneStatusChip status={scene.status} onClick={handleStatusClick} />
      </div>
      {preview && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {preview}
          {scene.body.length > 120 && "…"}
        </p>
      )}
      <CastStrip
        characters={characters}
        places={places}
        linkedCharacterIds={scene.linkedCharacterIds}
        linkedPlaceIds={scene.linkedPlaceIds}
        variant="compact"
      />
    </div>
  );
}

function SortableSceneCard(props: {
  scene: Scene;
  characters: Character[];
  places: Place[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.scene.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
    >
      <SceneCard {...props} dragHandleProps={listeners ?? {}} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-beat gutter
// ---------------------------------------------------------------------------

function BeatGutter({
  id,
  direction,
  beatTitle,
  disabled,
}: {
  id: string;
  direction: "prev" | "next";
  beatTitle?: string;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const [isDragging, setIsDragging] = useState(false);

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  if (disabled) return <div className="w-10 shrink-0" />;

  return (
    <div
      ref={setNodeRef}
      title={beatTitle}
      className={cn(
        "flex w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-all",
        "border-muted-foreground/15 opacity-40",
        isDragging && "border-muted-foreground/40 opacity-80",
        isOver && "border-primary bg-primary/5 opacity-100",
      )}
    >
      {direction === "prev" ? (
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beat detail client
// ---------------------------------------------------------------------------

export function BeatDetailClient({
  projectId,
  beatId,
  initialSceneId,
}: {
  projectId: string;
  beatId: string;
  initialSceneId?: string;
}) {
  const router = useRouter();
  const project = useLiveProject(projectId);
  const beat = useLiveQuery(() => db.beats.get(beatId), [beatId]);
  const scenes = useLiveScenes(beatId);
  const allBeats = useLiveBeats(projectId);
  const beatStatus = useLiveBeatStatus(beatId);
  const characters = useLiveCharacters(projectId);
  const places = useLivePlaces(projectId);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [wordCountActual, setWordCountActual] = useState("");
  const [wordCountTarget, setWordCountTarget] = useState("");
  const [openScene, setOpenScene] = useState<Scene | null>(null);
  const bodyRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync beat fields on load / beat change
  useEffect(() => {
    if (beat) {
      setTitle(beat.title);
      setBody(beat.body);
      setWordCountActual(beat.wordCountActual?.toString() ?? "");
      setWordCountTarget(beat.wordCountTarget?.toString() ?? "");
    }
  }, [beat?.id]);

  // Auto-open scene editor from URL param
  useEffect(() => {
    if (!initialSceneId || scenes.length === 0) return;
    const target = scenes.find((s) => s.id === initialSceneId);
    if (target) {
      setOpenScene(target);
      // Clear the param
      router.replace(`/projects/${projectId}/beats/${beatId}`, { scroll: false });
    }
  // Only run on initial mount + when scenes first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSceneId, scenes.length > 0]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (!beat || !project) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const hasScenes = scenes.length > 0;
  const effectiveStatus = beatStatus ?? beat.status;

  const beatIndex = allBeats.findIndex((b) => b.id === beatId);
  const prevBeat = beatIndex > 0 ? allBeats[beatIndex - 1] : null;
  const nextBeat = beatIndex < allBeats.length - 1 ? allBeats[beatIndex + 1] : null;

  // Union cast: beat's own + all scenes' when scenes exist
  const unionCharIds = hasScenes
    ? [...new Set([...beat.linkedCharacterIds, ...scenes.flatMap((s) => s.linkedCharacterIds)])]
    : beat.linkedCharacterIds;
  const unionPlaceIds = hasScenes
    ? [...new Set([...beat.linkedPlaceIds, ...scenes.flatMap((s) => s.linkedPlaceIds)])]
    : beat.linkedPlaceIds;

  // Keep live scene in drawer synced
  const liveOpenScene = openScene ? (scenes.find((s) => s.id === openScene.id) ?? null) : null;

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    clearTimeout(bodyRef.current);
    bodyRef.current = setTimeout(() => updateBeat(beat!.id, { body: value }), 600);
  }

  function handleBodyBlur() {
    clearTimeout(bodyRef.current);
    updateBeat(beat!.id, { body });
  }

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed) updateBeat(beat!.id, { title: trimmed });
    else setTitle(beat!.title);
  }

  function handleWordCountActualBlur() {
    const n = parseInt(wordCountActual, 10);
    updateBeat(beat!.id, { wordCountActual: !isNaN(n) && n >= 0 ? n : undefined });
  }

  function handleWordCountTargetBlur() {
    const n = parseInt(wordCountTarget, 10);
    updateBeat(beat!.id, { wordCountTarget: !isNaN(n) && n >= 0 ? n : undefined });
  }

  async function handleAddScene() {
    const id = await createScene(beatId, { projectId, title: "New scene" });
    const newScene = scenes.find((s) => s.id === id);
    if (newScene) setOpenScene(newScene);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    if (over.id === "gutter-prev" && prevBeat) {
      const scene = scenes.find((s) => s.id === active.id);
      if (!scene) return;
      const originalBeatId = scene.beatId;
      const originalOrder = scene.order;
      await moveSceneToBeat(String(active.id), prevBeat.id);
      toast.success(`Scene moved to "${prevBeat.title}".`, {
        action: {
          label: "Undo",
          onClick: () => moveSceneToBeat(String(active.id), originalBeatId, originalOrder),
        },
      });
      return;
    }

    if (over.id === "gutter-next" && nextBeat) {
      const scene = scenes.find((s) => s.id === active.id);
      if (!scene) return;
      const originalBeatId = scene.beatId;
      const originalOrder = scene.order;
      await moveSceneToBeat(String(active.id), nextBeat.id);
      toast.success(`Scene moved to "${nextBeat.title}".`, {
        action: {
          label: "Undo",
          onClick: () => moveSceneToBeat(String(active.id), originalBeatId, originalOrder),
        },
      });
      return;
    }

    // In-beat reorder
    if (active.id === over.id) return;
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove([...scenes], oldIndex, newIndex);
    const item = reordered[newIndex];
    const prev = reordered[newIndex - 1];
    const next = reordered[newIndex + 1];
    const newOrder = !prev
      ? next!.order - 1000
      : !next
        ? prev.order + 1000
        : (prev.order + next.order) / 2;

    await reorderScene(item.id, newOrder);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header / Breadcrumbs */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.title}
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium text-foreground">{beat.title}</span>
      </div>

      {/* Beat editing section */}
      <div className="border-b px-6 py-5">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Beat title"
          />

          {/* Craft prompt */}
          {beat.prompt && (
            <blockquote className="border-l-2 border-primary/40 pl-4 font-serif text-sm italic leading-relaxed text-muted-foreground">
              {beat.prompt}
            </blockquote>
          )}

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={body}
              onChange={handleBodyChange}
              onBlur={handleBodyBlur}
              placeholder="Write your beat notes here…"
              className="min-h-32 resize-y text-sm"
            />
          </div>

          {/* Status + Word count row */}
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              {!hasScenes ? (
                <div className="flex flex-wrap gap-1.5">
                  {BEAT_STATUS_OPTIONS.map((o) => {
                    const isActive = beat.status === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setBeatStatus(beat.id, o.value)}
                        className={cn(
                          "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors",
                          !isActive && "bg-muted text-muted-foreground hover:opacity-80",
                          o.value === "untouched" && isActive && "bg-[#5C4F42]/15 text-[#5C4F42]/80",
                          o.value === "drafted" && isActive && "bg-[#8B6F47] text-[#F2E8D5]",
                          o.value === "done" && isActive && "bg-[#52796F] text-[#F2E8D5]",
                          o.value === "skipped" && isActive && "bg-transparent px-1 text-[#7A2E2E]",
                        )}
                      >
                        {o.value === "skipped" && <X className="h-3 w-3" />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-semibold",
                      effectiveStatus === "untouched" && "bg-[#5C4F42]/15 text-[#5C4F42]/80",
                      effectiveStatus === "drafted" && "bg-[#8B6F47] text-[#F2E8D5]",
                      effectiveStatus === "done" && "bg-[#52796F] text-[#F2E8D5]",
                      effectiveStatus === "skipped" && "text-[#7A2E2E]",
                    )}
                  >
                    {effectiveStatus === "skipped" && <X className="mr-1 h-3 w-3" />}
                    {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Rolled up from scenes.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Target words</Label>
                <Input
                  type="number"
                  min={0}
                  value={wordCountTarget}
                  onChange={(e) => setWordCountTarget(e.target.value)}
                  onBlur={handleWordCountTargetBlur}
                  placeholder="—"
                  className="h-8 w-24 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Actual words</Label>
                <Input
                  type="number"
                  min={0}
                  value={wordCountActual}
                  onChange={(e) => setWordCountActual(e.target.value)}
                  onBlur={handleWordCountActualBlur}
                  placeholder="—"
                  className="h-8 w-24 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cast strip (two-row, display-only for the beat) */}
          {(unionCharIds.length > 0 || unionPlaceIds.length > 0) && (
            <CastStrip
              characters={characters}
              places={places}
              linkedCharacterIds={unionCharIds}
              linkedPlaceIds={unionPlaceIds}
              variant="compact"
            />
          )}
        </div>
      </div>

      {/* Scenes section */}
      <div className="flex-1 px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scenes{scenes.length > 0 && ` (${scenes.length})`}
          </h2>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-2">
              <BeatGutter
                id="gutter-prev"
                direction="prev"
                beatTitle={prevBeat?.title}
                disabled={!prevBeat}
              />

              <div className="flex flex-1 flex-col gap-2">
                <SortableContext
                  items={scenes.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {scenes.map((scene) => (
                    <SortableSceneCard
                      key={scene.id}
                      scene={scene}
                      characters={characters}
                      places={places}
                      onClick={() => setOpenScene(scene)}
                    />
                  ))}
                </SortableContext>

                <button
                  type="button"
                  onClick={handleAddScene}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add scene
                </button>
              </div>

              <BeatGutter
                id="gutter-next"
                direction="next"
                beatTitle={nextBeat?.title}
                disabled={!nextBeat}
              />
            </div>
          </DndContext>
        </div>
      </div>

      <SceneEditorDrawer
        scene={liveOpenScene}
        characters={characters}
        places={places}
        projectId={projectId}
        onClose={() => setOpenScene(null)}
      />
    </div>
  );
}
