"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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
      <Button size="lg" className="gap-2" onClick={() => router.push("/projects/new")}>
        <BookOpen className="h-5 w-5" />
        Start a new project
      </Button>
    </div>
  );
}
