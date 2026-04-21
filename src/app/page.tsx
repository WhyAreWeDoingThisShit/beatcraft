"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookOpen, Upload } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function checkProjects() {
      try {
        const { db } = await import("@/lib/db");
        const projects = await db.projects.orderBy("updatedAt").reverse().limit(1).toArray();
        if (projects.length > 0) {
          router.replace(`/projects/${projects[0].id}`);
          return;
        }
      } catch {
        // DB not yet initialized or first visit — show empty state
      }
      setChecking(false);
    }
    checkProjects();
  }, [router]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const { importProject } = await import("@/lib/io");
      const id = await importProject(file);
      toast.success("Project imported.");
      router.push(`/projects/${id}`);
    } catch {
      toast.error("Could not import file. Make sure it's a valid Bosanquet JSON export.");
    } finally {
      setImporting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-4xl font-bold text-primary-foreground">
        B
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Bosanquet</h1>
        <p className="max-w-md text-muted-foreground">
          A writing planner that scaffolds your story beats. Pick a format,
          choose a methodology, and start planning.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="lg" className="gap-2" onClick={() => router.push("/projects/new")}>
          <BookOpen className="h-5 w-5" />
          Start a new project
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="gap-2"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5" />
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
    </div>
  );
}
