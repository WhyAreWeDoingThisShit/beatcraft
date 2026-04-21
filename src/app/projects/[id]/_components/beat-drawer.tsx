"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteBeat, updateBeat } from "@/lib/db-helpers";
import type { Beat, BeatStatus, Character, Place } from "@/lib/db";

const STATUS_OPTIONS: { value: BeatStatus; label: string }[] = [
  { value: "untouched", label: "Untouched" },
  { value: "drafted", label: "Drafted" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

interface BeatDrawerProps {
  beat: Beat | null;
  characters: Character[];
  places: Place[];
  onClose: () => void;
}

export function BeatDrawer({ beat, characters, places, onClose }: BeatDrawerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [wordCountActual, setWordCountActual] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (beat) {
      setTitle(beat.title);
      setBody(beat.body);
      setWordCountActual(beat.wordCountActual?.toString() ?? "");
    }
  }, [beat?.id]);

  if (!beat) return null;

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      updateBeat(beat!.id, { body: value });
    }, 600);
  }

  function handleBodyBlur() {
    clearTimeout(saveRef.current);
    updateBeat(beat!.id, { body });
  }

  function handleTitleBlur() {
    if (title.trim()) updateBeat(beat!.id, { title: title.trim() });
    else setTitle(beat!.title);
  }

  function handleWordCountBlur() {
    const n = parseInt(wordCountActual, 10);
    const val = !isNaN(n) && n >= 0 ? n : undefined;
    updateBeat(beat!.id, { wordCountActual: val });
  }

  function handleStatusChange(status: BeatStatus) {
    updateBeat(beat!.id, { status });
  }

  function toggleCharacter(charId: string) {
    const ids = beat!.linkedCharacterIds;
    const next = ids.includes(charId) ? ids.filter((id) => id !== charId) : [...ids, charId];
    updateBeat(beat!.id, { linkedCharacterIds: next });
  }

  function togglePlace(placeId: string) {
    const ids = beat!.linkedPlaceIds;
    const next = ids.includes(placeId) ? ids.filter((id) => id !== placeId) : [...ids, placeId];
    updateBeat(beat!.id, { linkedPlaceIds: next });
  }

  async function handleDelete() {
    setConfirmDelete(false);
    onClose();
    await deleteBeat(beat!.id);
    toast.success("Beat deleted.");
  }

  return (
    <>
      <Sheet open={!!beat} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 pb-4">
            <SheetTitle className="sr-only">Edit beat</SheetTitle>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Beat title"
            />
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 p-5">
            {beat.prompt && (
              <blockquote className="border-l-2 border-primary/40 pl-4 font-serif text-sm italic leading-relaxed text-muted-foreground">
                {beat.prompt}
              </blockquote>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={body}
                onChange={handleBodyChange}
                onBlur={handleBodyBlur}
                placeholder="Write your beat notes here…"
                className="min-h-40 resize-y text-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={beat.status}
                  onChange={(e) => handleStatusChange(e.target.value as BeatStatus)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Word count</Label>
                <Input
                  type="number"
                  min={0}
                  value={wordCountActual}
                  onChange={(e) => setWordCountActual(e.target.value)}
                  onBlur={handleWordCountBlur}
                  placeholder="—"
                  className="h-8 w-28 text-sm"
                />
              </div>
            </div>

            {characters.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Characters</Label>
                <div className="flex flex-wrap gap-1.5">
                  {characters.map((c) => {
                    const linked = beat.linkedCharacterIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCharacter(c.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          linked
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: c.color ?? "#6366f1" }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {places.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Places</Label>
                <div className="flex flex-wrap gap-1.5">
                  {places.map((p) => {
                    const linked = beat.linkedPlaceIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlace(p.id)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          linked
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-5 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete beat
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete this beat?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{beat.title}&rdquo; will be permanently removed.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
