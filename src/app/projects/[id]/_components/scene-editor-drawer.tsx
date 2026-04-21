"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
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
import { deleteScene, getPreviousScene, updateScene, setSceneStatus } from "@/lib/db-helpers";
import type { Character, Place, Scene, SceneStatus } from "@/lib/db";
import { CastStrip } from "./cast-strip";
import {
  CharacterDrawer,
} from "../wiki/_components/character-drawer";
import { PlaceDrawer } from "../wiki/_components/place-drawer";

const STATUS_OPTIONS: { value: SceneStatus; label: string }[] = [
  { value: "untouched", label: "Untouched" },
  { value: "drafted", label: "Drafted" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

interface SceneEditorDrawerProps {
  scene: Scene | null;
  characters: Character[];
  places: Place[];
  projectId: string;
  onClose: () => void;
}

export function SceneEditorDrawer({
  scene,
  characters,
  places,
  projectId,
  onClose,
}: SceneEditorDrawerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Nested entity drawers
  const [openChar, setOpenChar] = useState<Character | "new" | null>(null);
  const [openPlace, setOpenPlace] = useState<Place | "new" | null>(null);

  const prevScene = useLiveQuery(
    () => (scene ? getPreviousScene(scene.id) : Promise.resolve(undefined)),
    [scene?.id],
  );

  useEffect(() => {
    if (scene) {
      setTitle(scene.title);
      setBody(scene.body);
    }
  }, [scene?.id]);

  if (!scene) return null;

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      updateScene(scene!.id, { body: value });
    }, 600);
  }

  function handleBodyBlur() {
    clearTimeout(saveRef.current);
    updateScene(scene!.id, { body });
  }

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (trimmed) updateScene(scene!.id, { title: trimmed });
    else setTitle(scene!.title);
  }

  function handleStatusChange(status: SceneStatus) {
    setSceneStatus(scene!.id, status);
  }

  function handleAddCharacter(charId: string) {
    const ids = scene!.linkedCharacterIds;
    if (!ids.includes(charId)) {
      updateScene(scene!.id, { linkedCharacterIds: [...ids, charId] });
    }
  }

  function handleRemoveCharacter(charId: string) {
    updateScene(scene!.id, {
      linkedCharacterIds: scene!.linkedCharacterIds.filter((id) => id !== charId),
    });
  }

  function handleAddPlace(placeId: string) {
    const ids = scene!.linkedPlaceIds;
    if (!ids.includes(placeId)) {
      updateScene(scene!.id, { linkedPlaceIds: [...ids, placeId] });
    }
  }

  function handleRemovePlace(placeId: string) {
    updateScene(scene!.id, {
      linkedPlaceIds: scene!.linkedPlaceIds.filter((id) => id !== placeId),
    });
  }

  function handleSameAsPrevious() {
    if (!prevScene) return;
    const mergedChars = [
      ...new Set([...scene!.linkedCharacterIds, ...prevScene.linkedCharacterIds]),
    ];
    const mergedPlaces = [
      ...new Set([...scene!.linkedPlaceIds, ...prevScene.linkedPlaceIds]),
    ];
    updateScene(scene!.id, {
      linkedCharacterIds: mergedChars,
      linkedPlaceIds: mergedPlaces,
    });
  }

  async function handleDelete() {
    setConfirmDelete(false);
    onClose();
    await deleteScene(scene!.id);
    toast.success("Scene deleted.");
  }

  return (
    <>
      <Sheet open={!!scene} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 pb-4">
            <SheetTitle className="sr-only">Edit scene</SheetTitle>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Scene title"
            />
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 p-5">
            <CastStrip
              characters={characters}
              places={places}
              linkedCharacterIds={scene.linkedCharacterIds}
              linkedPlaceIds={scene.linkedPlaceIds}
              variant="full"
              onAddCharacter={handleAddCharacter}
              onRemoveCharacter={handleRemoveCharacter}
              onAddPlace={handleAddPlace}
              onRemovePlace={handleRemovePlace}
              onOpenCharacter={(c) => setOpenChar(c)}
              onOpenPlace={(p) => setOpenPlace(p)}
              onSameAsPrevious={handleSameAsPrevious}
              hasPrevious={!!prevScene}
              onCreateCharacter={() => setOpenChar("new")}
              onCreatePlace={() => setOpenPlace("new")}
            />

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={body}
                onChange={handleBodyChange}
                onBlur={handleBodyBlur}
                placeholder="Write your scene notes here…"
                className="min-h-40 resize-y text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((o) => {
                  const isActive = scene.status === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => handleStatusChange(o.value)}
                      className={cn(
                        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
            </div>
          </div>

          <div className="border-t p-5 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete scene
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete this scene?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{scene.title}&rdquo; will be permanently removed.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested wiki drawers overlaying scene editor */}
      <CharacterDrawer
        character={openChar}
        projectId={projectId}
        linkedBeats={[]}
        linkedScenes={[]}
        onClose={() => setOpenChar(null)}
        onJumpToBeat={() => {}}
      />
      <PlaceDrawer
        place={openPlace}
        projectId={projectId}
        linkedBeats={[]}
        linkedScenes={[]}
        onClose={() => setOpenPlace(null)}
        onJumpToBeat={() => {}}
      />
    </>
  );
}
