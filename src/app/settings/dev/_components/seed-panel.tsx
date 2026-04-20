"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createProject, deleteProject, listProjects } from "@/lib/db-helpers";
import { toast } from "sonner";

export function SeedPanel() {
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      await createProject({
        title: "The Last Signal",
        logline: "A lone astronaut discovers the distress call she's been following is her own.",
        format: "screenplay",
        methodology: "save-the-cat",
      });

      await createProject({
        title: "Salt and Iron",
        logline: "A disgraced blacksmith must reforge the sword that killed her king.",
        format: "novel",
        methodology: "heros-journey",
        targetWordCount: 90000,
      });

      toast.success("Two demo projects created.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    setBusy(true);
    try {
      const projects = await listProjects();
      await Promise.all(projects.map((p) => deleteProject(p.id)));
      toast.success(`Deleted ${projects.length} project(s).`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-8 max-w-md">
      <h1 className="text-xl font-semibold">Dev tools</h1>
      <p className="text-sm text-muted-foreground">
        These actions are only available in development builds.
      </p>
      <div className="flex gap-3">
        <Button onClick={seed} disabled={busy}>
          Seed demo projects
        </Button>
        <Button variant="destructive" onClick={wipe} disabled={busy}>
          Wipe all projects
        </Button>
      </div>
    </div>
  );
}
