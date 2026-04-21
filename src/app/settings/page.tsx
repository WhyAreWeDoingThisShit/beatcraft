"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Upload, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { importProject } from "@/lib/io";
import { eraseAllData } from "@/lib/db-helpers";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showErase, setShowErase] = useState(false);
  const [eraseConfirm, setEraseConfirm] = useState("");

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const id = await importProject(file);
      toast.success("Project imported.");
      router.push(`/projects/${id}`);
    } catch {
      toast.error("Could not import file. Make sure it's a valid Beatcraft JSON export.");
    } finally {
      setImporting(false);
    }
  }

  async function handleErase() {
    if (eraseConfirm.trim().toLowerCase() !== "erase all data") return;
    setShowErase(false);
    await eraseAllData();
    toast.success("All data erased.");
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-6 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Appearance */}
      <section className="space-y-4" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Appearance
        </h2>

        <div className="flex items-center gap-3">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
        </div>
      </section>

      <Separator />

      {/* Data */}
      <section className="space-y-4" aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data
        </h2>

        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Import a project from a Beatcraft JSON export file.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import project"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleImport}
            aria-label="Import project JSON file"
          />
        </div>
      </section>

      <Separator />

      {/* About */}
      <section className="space-y-4" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          About
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Source</span>
            <a
              href="https://github.com/WhyAreWeDoingThisShit/beatcraft"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-foreground hover:underline"
            >
              GitHub
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>
        </div>
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
              <p className="text-sm font-medium">Erase all data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes every project, beat, character, and place stored on this device.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => { setEraseConfirm(""); setShowErase(true); }}
            >
              Erase all data
            </Button>
          </div>
        </div>
      </section>

      {/* Erase confirmation dialog */}
      <Dialog open={showErase} onOpenChange={setShowErase}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Erase everything?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all projects, beats, characters, and places on this device. There is no undo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="erase-confirm">
              Type <strong>erase all data</strong> to confirm
            </Label>
            <Input
              id="erase-confirm"
              value={eraseConfirm}
              onChange={(e) => setEraseConfirm(e.target.value)}
              placeholder="erase all data"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={eraseConfirm.trim().toLowerCase() !== "erase all data"}
              onClick={handleErase}
            >
              Erase everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
