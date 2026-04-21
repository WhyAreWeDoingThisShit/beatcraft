"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createCharacter, deleteCharacter, updateCharacter } from "@/lib/db-helpers";
import type { Beat, Character } from "@/lib/db";

export const CHARACTER_COLORS = [
  { value: "#f43f5e", label: "Rose" },
  { value: "#f97316", label: "Orange" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
];

const ROLE_SUGGESTIONS = [
  "Protagonist",
  "Antagonist",
  "Deuteragonist",
  "Mentor",
  "Ally",
  "Love Interest",
  "Foil",
  "Mirror",
];

export function characterInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface CharacterDrawerProps {
  character: Character | "new" | null;
  projectId: string;
  linkedBeats: Beat[];
  onClose: () => void;
  onJumpToBeat: (beatId: string) => void;
}

export function CharacterDrawer({
  character,
  projectId,
  linkedBeats,
  onClose,
  onJumpToBeat,
}: CharacterDrawerProps) {
  const isNew = character === "new";
  const char = character !== "new" ? character : null;

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [want, setWant] = useState("");
  const [need, setNeed] = useState("");
  const [flaw, setFlaw] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(CHARACTER_COLORS[5].value);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (char) {
      setName(char.name);
      setRole(char.role ?? "");
      setWant(char.want ?? "");
      setNeed(char.need ?? "");
      setFlaw(char.flaw ?? "");
      setNotes(char.notes);
      setColor(char.color ?? CHARACTER_COLORS[5].value);
    } else if (isNew) {
      setName("");
      setRole("");
      setWant("");
      setNeed("");
      setFlaw("");
      setNotes("");
      setColor(CHARACTER_COLORS[5].value);
    }
  }, [char?.id, isNew]);

  const open = character !== null;

  function save(overrides?: Partial<Character>) {
    const data = {
      name: name.trim() || "Unnamed",
      role: role.trim() || undefined,
      want: want.trim() || undefined,
      need: need.trim() || undefined,
      flaw: flaw.trim() || undefined,
      notes,
      color,
      ...overrides,
    };
    if (char) {
      updateCharacter(char.id, data);
    }
  }

  async function handleSaveNew() {
    if (!name.trim()) return;
    await createCharacter({
      projectId,
      name: name.trim(),
      role: role.trim() || undefined,
      want: want.trim() || undefined,
      need: need.trim() || undefined,
      flaw: flaw.trim() || undefined,
      notes,
      color,
    });
    onClose();
  }

  async function handleDelete() {
    if (!char) return;
    setConfirmDelete(false);
    onClose();
    await deleteCharacter(char.id);
    toast.success("Character deleted.");
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {characterInitials(name || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="sr-only">
                  {isNew ? "New character" : char?.name}
                </SheetTitle>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => !isNew && save({ name: name.trim() || "Unnamed" })}
                  placeholder="Character name"
                  className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 p-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <input
                list="role-suggestions"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onBlur={() => !isNew && save()}
                placeholder="e.g. Protagonist"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
              <datalist id="role-suggestions">
                {ROLE_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Want</Label>
              <p className="text-[11px] text-muted-foreground/70">
                The external, concrete goal — what they&rsquo;d say they want.
              </p>
              <Textarea
                value={want}
                onChange={(e) => setWant(e.target.value)}
                onBlur={() => !isNew && save()}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Need</Label>
              <p className="text-[11px] text-muted-foreground/70">
                The internal truth they must learn — what the story knows they need.
              </p>
              <Textarea
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                onBlur={() => !isNew && save()}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Flaw</Label>
              <p className="text-[11px] text-muted-foreground/70">
                The specific way they get in their own way.
              </p>
              <Textarea
                value={flaw}
                onChange={(e) => setFlaw(e.target.value)}
                onBlur={() => !isNew && save()}
                rows={2}
                className="resize-none text-sm"
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

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex gap-2">
                {CHARACTER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      setColor(c.value);
                      if (!isNew) save({ color: c.value });
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform hover:scale-110",
                      color === c.value && "ring-2 ring-offset-2 ring-offset-background ring-foreground/30",
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {linkedBeats.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">
                  Appears in ({linkedBeats.length})
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
          </div>

          <div className="border-t p-5 pt-4 flex items-center justify-between">
            {isNew ? (
              <Button size="sm" onClick={handleSaveNew} disabled={!name.trim()}>
                Add character
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
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
            <DialogTitle>Delete {char?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This character will be removed from all beats.
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
