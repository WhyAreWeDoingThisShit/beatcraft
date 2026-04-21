"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { createPlace, deletePlace, getEntityUsage, updatePlace } from "@/lib/db-helpers";
import type { Beat, Place, Scene } from "@/lib/db";

const KIND_OPTIONS = [
  "Room",
  "Building",
  "City",
  "Region",
  "Dreamscape",
  "Other",
];

interface PlaceDrawerProps {
  place: Place | "new" | null;
  projectId: string;
  linkedBeats: Beat[];
  linkedScenes: Scene[];
  onClose: () => void;
  onJumpToBeat: (beatId: string) => void;
}

export function PlaceDrawer({
  place,
  projectId,
  linkedBeats,
  linkedScenes,
  onClose,
  onJumpToBeat,
}: PlaceDrawerProps) {
  const isNew = place === "new";
  const p = place !== "new" ? place : null;

  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [usage, setUsage] = useState<{ beatCount: number; sceneCount: number } | null>(null);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setKind(p.kind ?? "");
      setDescription(p.description);
      setNotes(p.notes);
    } else if (isNew) {
      setName("");
      setKind("");
      setDescription("");
      setNotes("");
    }
  }, [p?.id, isNew]);

  const open = place !== null;

  function save(overrides?: Partial<Place>) {
    if (!p) return;
    updatePlace(p.id, {
      name: name.trim() || "Unnamed",
      kind: kind.trim() || undefined,
      description,
      notes,
      ...overrides,
    });
  }

  async function handleSaveNew() {
    if (!name.trim()) return;
    await createPlace({
      projectId,
      name: name.trim(),
      kind: kind.trim() || undefined,
      description,
      notes,
    });
    onClose();
  }

  async function handleOpenDeleteConfirm() {
    if (!p) return;
    const u = await getEntityUsage(p.id, "place");
    setUsage(u);
    setConfirmDelete(true);
  }

  async function handleDelete() {
    if (!p) return;
    setConfirmDelete(false);
    onClose();
    await deletePlace(p.id);
    toast.success("Place deleted.");
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 pb-4">
            <SheetTitle className="sr-only">
              {isNew ? "New place" : p?.name}
            </SheetTitle>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !isNew && save({ name: name.trim() || "Unnamed" })}
              placeholder="Place name"
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            />
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 p-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Kind</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                onBlur={() => !isNew && save()}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="">— none —</option>
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => !isNew && save()}
                rows={3}
                className="resize-y text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => !isNew && save()}
                rows={3}
                className="resize-y text-sm"
              />
            </div>

            {linkedBeats.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  Beats ({linkedBeats.length})
                </Label>
                <ul className="flex flex-col gap-1">
                  {linkedBeats.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onJumpToBeat(b.id);
                        }}
                        className="w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        {b.act && (
                          <span className="mr-1.5 text-xs text-muted-foreground">
                            {b.act} ·
                          </span>
                        )}
                        {b.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {linkedScenes.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  Scenes ({linkedScenes.length})
                </Label>
                <ul className="flex flex-col gap-1">
                  {linkedScenes.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onJumpToBeat(s.beatId);
                        }}
                        className="w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t p-5 pt-4 flex items-center justify-between">
            {isNew ? (
              <Button size="sm" onClick={handleSaveNew} disabled={!name.trim()}>
                Add place
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleOpenDeleteConfirm}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{p?.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          {usage && (usage.beatCount > 0 || usage.sceneCount > 0) ? (
            <p className="text-sm text-muted-foreground">
              {p?.name} is currently tagged in{" "}
              {usage.beatCount > 0 && (
                <strong>{usage.beatCount} beat{usage.beatCount !== 1 ? "s" : ""}</strong>
              )}
              {usage.beatCount > 0 && usage.sceneCount > 0 && " and "}
              {usage.sceneCount > 0 && (
                <strong>{usage.sceneCount} scene{usage.sceneCount !== 1 ? "s" : ""}</strong>
              )}
              . Deleting will remove all of these tags. This can&rsquo;t be undone.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This place will be permanently removed. This can&rsquo;t be undone.
            </p>
          )}
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
