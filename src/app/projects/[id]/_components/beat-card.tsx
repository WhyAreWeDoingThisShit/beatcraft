"use client";

import { GripVertical, MessageSquareText, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { setBeatStatus } from "@/lib/db-helpers";
import { useLiveBeatStatus, useLiveSceneCount } from "@/lib/use-live";
import type { Beat, BeatStatus, Character, Place } from "@/lib/db";
import { CastStrip } from "./cast-strip";

const STATUS_NEXT: Record<BeatStatus, BeatStatus> = {
  untouched: "drafted",
  drafted: "done",
  done: "skipped",
  skipped: "untouched",
};

const STATUS_LABEL: Record<BeatStatus, string> = {
  untouched: "Untouched",
  drafted: "Drafted",
  done: "Done",
  skipped: "Skipped",
};

function StatusChip({
  status,
  hasScenes,
  onClick,
}: {
  status: BeatStatus;
  hasScenes: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const clickProps = hasScenes
    ? {
        title: "Derived from scenes",
        style: { cursor: "default" as const },
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }
    : { onClick };

  if (status === "skipped") {
    return (
      <button
        type="button"
        aria-label="Skipped"
        className="inline-flex h-5 items-center px-1 transition-opacity hover:opacity-70"
        {...clickProps}
      >
        <X className="h-3.5 w-3.5" style={{ color: "#7A2E2E" }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold transition-colors",
        status === "untouched" && "bg-[#5C4F42]/15 text-[#5C4F42]/70",
        status === "drafted" && "bg-[#8B6F47] text-[#F2E8D5]",
        status === "done" && "bg-[#52796F] text-[#F2E8D5]",
        hasScenes && "cursor-default",
      )}
      {...clickProps}
    >
      {STATUS_LABEL[status]}
    </button>
  );
}

interface BeatCardProps {
  beat: Beat;
  characters: Character[];
  places: Place[];
  projectId: string;
  onOpen: () => void;
}

function BeatCardInner({
  beat,
  characters,
  places,
  projectId,
  onOpen,
  dragHandleProps,
}: BeatCardProps & { dragHandleProps: Record<string, unknown> }) {
  const effectiveStatus = useLiveBeatStatus(beat.id) ?? beat.status;
  const sceneCount = useLiveSceneCount(beat.id);
  const hasScenes = sceneCount > 0;

  function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    setBeatStatus(beat.id, STATUS_NEXT[effectiveStatus]);
  }

  const hasWordTarget = beat.wordCountTarget !== undefined && beat.wordCountTarget > 0;
  const progress = hasWordTarget
    ? Math.min(100, Math.round(((beat.wordCountActual ?? 0) / beat.wordCountTarget!) * 100))
    : null;

  const preview = beat.body.slice(0, 120);
  const isSkipped = effectiveStatus === "skipped";

  // Union cast: beat's own + scenes' when scenes exist (computed from props for beat card compact display)
  // Note: for the board we show only beat's own links; the full union is on the beat detail page.
  // Per spec section 2 table: beat card shows linked characters/places as two rows of icons.

  return (
    <div
      role="article"
      aria-label={`Beat: ${beat.title}`}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-border/80 hover:shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        isSkipped && "opacity-70",
      )}
      onClick={onOpen}
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

        <span className="flex-1 truncate font-medium text-foreground">
          {beat.title}
        </span>

        <div className="flex items-center gap-1.5">
          {sceneCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquareText className="h-3 w-3" />
              {sceneCount}
            </span>
          )}
          <StatusChip
            status={effectiveStatus}
            hasScenes={hasScenes}
            onClick={handleStatusClick}
          />
        </div>
      </div>

      {progress !== null && <Progress value={progress} className="h-1" />}

      {preview && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {preview}
          {beat.body.length > 120 && "…"}
        </p>
      )}

      <CastStrip
        characters={characters}
        places={places}
        linkedCharacterIds={beat.linkedCharacterIds}
        linkedPlaceIds={beat.linkedPlaceIds}
        variant="compact"
      />
    </div>
  );
}

export function SortableBeatCard(props: BeatCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.beat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BeatCardInner {...props} dragHandleProps={listeners ?? {}} />
    </div>
  );
}
