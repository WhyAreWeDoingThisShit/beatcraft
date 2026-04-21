"use client";

import { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { updateBeat, setBeatStatus } from "@/lib/db-helpers";
import type { Beat, BeatStatus, Character, Place } from "@/lib/db";

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
  onClick,
}: {
  status: BeatStatus;
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

interface BeatCardProps {
  beat: Beat;
  characters: Character[];
  places: Place[];
  onOpen: () => void;
}

function BeatCardInner({ beat, characters, places, onOpen, dragHandleProps }: BeatCardProps & { dragHandleProps: Record<string, unknown> }) {
  const [title, setTitle] = useState(beat.title);
  const titleSaved = useRef(beat.title);

  // Sync title when beat changes from outside
  if (beat.title !== titleSaved.current && document.activeElement?.tagName !== "INPUT") {
    setTitle(beat.title);
    titleSaved.current = beat.title;
  }

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== beat.title) {
      updateBeat(beat.id, { title: trimmed });
      titleSaved.current = trimmed;
    } else {
      setTitle(beat.title);
    }
  }

  function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    setBeatStatus(beat.id, STATUS_NEXT[beat.status]);
  }

  const linkedChars = characters.filter((c) => beat.linkedCharacterIds.includes(c.id));
  const linkedPlaces = places.filter((p) => beat.linkedPlaceIds.includes(p.id));
  const preview = beat.body.slice(0, 120);
  const hasWordTarget = beat.wordCountTarget !== undefined && beat.wordCountTarget > 0;
  const progress = hasWordTarget
    ? Math.min(100, Math.round(((beat.wordCountActual ?? 0) / beat.wordCountTarget!) * 100))
    : null;

  const isSkipped = beat.status === "skipped";

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

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 truncate bg-transparent font-medium text-foreground outline-none"
        />

        <StatusChip status={beat.status} onClick={handleStatusClick} />
      </div>

      {progress !== null && (
        <Progress
          value={progress}
          className="h-1"
        />
      )}

      {preview && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {preview}
          {beat.body.length > 120 && "…"}
        </p>
      )}

      {(linkedChars.length > 0 || linkedPlaces.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {linkedChars.map((c) => (
            <span
              key={c.id}
              className="inline-flex h-4 items-center rounded-full px-1.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: c.color ?? "#6366f1" }}
            >
              {c.name}
            </span>
          ))}
          {linkedPlaces.map((p) => (
            <span
              key={p.id}
              className="inline-flex h-4 items-center rounded-full border border-border px-1.5 text-[10px] font-medium text-muted-foreground"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
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
