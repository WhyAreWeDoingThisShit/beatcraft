"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileJson, FileText, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useLiveProject } from "@/lib/use-live";
import {
  changeMethodology,
  deleteProject,
  detachFromMethodology,
  updateProject,
} from "@/lib/db-helpers";
import {
  exportProject,
  exportProjectAsMarkdown,
  exportProjectAsZip,
} from "@/lib/io";
import type { Format, Methodology } from "@/lib/db";

const FORMAT_OPTIONS: { value: Format; label: string }[] = [
  { value: "novel", label: "Novel" },
  { value: "screenplay", label: "Screenplay" },
  { value: "short-story", label: "Short Story" },
  { value: "stage-play", label: "Stage Play" },
  { value: "tv-pilot", label: "TV Pilot" },
];

const METHODOLOGY_OPTIONS: { value: Methodology; label: string }[] = [
  { value: "three-act", label: "3-Act Structure" },
  { value: "save-the-cat", label: "Save the Cat" },
  { value: "heros-journey", label: "Hero's Journey" },
  { value: "freeform", label: "Freeform" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

export function SettingsClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useLiveProject(projectId);

  // Form state
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [format, setFormat] = useState<Format>("novel");
  const [wordCount, setWordCount] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [deadline, setDeadline] = useState("");

  // Dialogs
  const [pendingMethodology, setPendingMethodology] = useState<Methodology | null>(null);
  const [showDetach, setShowDetach] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Seed form once project loads
  const seeded = useRef(false);
  useEffect(() => {
    if (project && !seeded.current) {
      seeded.current = true;
      setTitle(project.title);
      setLogline(project.logline ?? "");
      setFormat(project.format);
      setWordCount(project.targetWordCount?.toString() ?? "");
      setPageCount(project.targetPageCount?.toString() ?? "");
      if (project.deadline) {
        const d = new Date(project.deadline);
        setDeadline(d.toISOString().split("T")[0]);
      }
    }
  }, [project]);

  if (!project) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  async function handleSave() {
    const deadlineMs = deadline ? new Date(deadline).getTime() : undefined;
    await updateProject(projectId, {
      title: title.trim() || project!.title,
      logline: logline.trim() || undefined,
      format,
      targetWordCount: wordCount ? parseInt(wordCount, 10) : undefined,
      targetPageCount: pageCount ? parseInt(pageCount, 10) : undefined,
      deadline: deadlineMs,
    });
    toast.success("Settings saved.");
  }

  async function handleMethodologyChange(methodology: Methodology) {
    if (methodology === project!.methodology) return;
    if (methodology === "freeform") {
      setShowDetach(true);
    } else {
      setPendingMethodology(methodology);
    }
  }

  async function handleConfirmMethodology(keepCustoms: boolean) {
    if (!pendingMethodology) return;
    setPendingMethodology(null);
    await changeMethodology(projectId, pendingMethodology, keepCustoms);
    toast.success(`Methodology changed to ${METHODOLOGY_OPTIONS.find(o => o.value === pendingMethodology)?.label}.`);
  }

  async function handleDetach() {
    setShowDetach(false);
    await detachFromMethodology(projectId);
    toast.success("Project detached — now Freeform.");
  }

  async function handleExportJSON() {
    const blob = await exportProject(projectId);
    downloadBlob(blob, `${slugify(project!.title)}.bosanquet.json`);
  }

  async function handleExportMarkdown() {
    const blob = await exportProjectAsMarkdown(projectId);
    downloadBlob(blob, `${slugify(project!.title)}.md`);
  }

  async function handleExportZip() {
    const blob = await exportProjectAsZip(projectId);
    downloadBlob(blob, `${slugify(project!.title)}.bosanquet.zip`);
  }

  async function handleDelete() {
    if (deleteConfirmText.trim() !== project!.title) return;
    setShowDelete(false);
    await deleteProject(projectId);
    toast.success("Project deleted.");
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Board
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium">Settings</span>
      </div>

      <h1 className="text-2xl font-bold">Project settings</h1>

      {/* Metadata */}
      <section className="space-y-5" aria-labelledby="metadata-heading">
        <h2 id="metadata-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          About this project
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="proj-title">Title</Label>
          <Input
            id="proj-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proj-logline">Logline</Label>
          <Input
            id="proj-logline"
            value={logline}
            onChange={(e) => setLogline(e.target.value)}
            placeholder="One sentence that names the protagonist, their goal, and what's in the way."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proj-format">Format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
            <SelectTrigger id="proj-format" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      {/* Targets */}
      <section className="space-y-5" aria-labelledby="targets-heading">
        <h2 id="targets-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Targets
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-wc">Target word count</Label>
            <Input
              id="proj-wc"
              type="number"
              min={0}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              placeholder="80,000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-pc">Target page count</Label>
            <Input
              id="proj-pc"
              type="number"
              min={0}
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder="300"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proj-deadline">Deadline</Label>
          <Input
            id="proj-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-48"
          />
        </div>
      </section>

      <div className="flex">
        <Button onClick={handleSave}>Save changes</Button>
      </div>

      <Separator />

      {/* Methodology */}
      <section className="space-y-4" aria-labelledby="method-heading">
        <div>
          <h2 id="method-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Methodology
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changing methodology replaces scaffold beats. Your own writing is never automatically deleted — you choose what to keep.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={project.methodology}
            onValueChange={(v) => handleMethodologyChange(v as Methodology)}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODOLOGY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {project.methodology !== "freeform" && (
            <Button variant="outline" size="sm" onClick={() => setShowDetach(true)}>
              Detach to Freeform
            </Button>
          )}
        </div>
      </section>

      <Separator />

      {/* Export */}
      <section className="space-y-4" aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Export
        </h2>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportJSON}>
            <FileJson className="h-4 w-4" />
            JSON
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportMarkdown}>
            <FileText className="h-4 w-4" />
            Markdown
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportZip}>
            <Archive className="h-4 w-4" />
            ZIP bundle
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ZIP includes JSON, Markdown, characters.json, and places.json.
        </p>
      </section>

      <Separator />

      {/* Danger zone */}
      <section className="space-y-4" aria-labelledby="danger-heading">
        <h2 id="danger-heading" className="text-sm font-semibold uppercase tracking-wider text-destructive/80">
          Danger zone
        </h2>

        <div className="rounded-lg border border-destructive/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete this project</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently removes all beats, characters, and places. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => { setDeleteConfirmText(""); setShowDelete(true); }}
            >
              Delete project
            </Button>
          </div>
        </div>
      </section>

      {/* Methodology change dialog */}
      <Dialog open={!!pendingMethodology} onOpenChange={(v) => !v && setPendingMethodology(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Change to {METHODOLOGY_OPTIONS.find(o => o.value === pendingMethodology)?.label}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Scaffold beats will be replaced with the new structure. What would you like to do with your custom beats?
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={() => handleConfirmMethodology(false)}>
              Replace everything
            </Button>
            <Button variant="outline" onClick={() => handleConfirmMethodology(true)}>
              Keep my custom beats, replace scaffold
            </Button>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detach dialog */}
      <Dialog open={showDetach} onOpenChange={setShowDetach}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Detach from methodology?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your project switches to Freeform. All beats are kept; act groupings are removed.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleDetach}>Detach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{project.title}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all beats, characters, and places. Type the project title to confirm.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">Type <strong>{project.title}</strong> to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={project.title}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteConfirmText.trim() !== project.title}
              onClick={handleDelete}
            >
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
