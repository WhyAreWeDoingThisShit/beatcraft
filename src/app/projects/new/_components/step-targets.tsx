"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardValues } from "@/stores/new-project-store";
import type { Format } from "@/lib/db";

function TargetHint({ format }: { format: string }) {
  switch (format as Format) {
    case "novel":
      return <span className="text-xs text-muted-foreground">Default: 80,000 words</span>;
    case "short-story":
      return <span className="text-xs text-muted-foreground">Default: 5,000 words</span>;
    case "screenplay":
      return <span className="text-xs text-muted-foreground">Default: 100 pages (feature)</span>;
    case "tv-pilot":
      return <span className="text-xs text-muted-foreground">Default: 55 pages (hour pilot)</span>;
    case "stage-play":
      return <span className="text-xs text-muted-foreground">Default: 90 pages</span>;
    default:
      return null;
  }
}

export function StepTargets() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const format = watch("format") as Format | "";
  const showWordCount = format === "novel" || format === "short-story";
  const showPageCount =
    format === "screenplay" || format === "tv-pilot" || format === "stage-play";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        All fields here are optional. You can set or change targets from project settings at any time.
      </p>

      {showWordCount && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="targetWordCount">Target word count</Label>
            <TargetHint format={format} />
          </div>
          <Input
            id="targetWordCount"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 80000"
            className={cn(errors.targetWordCount && "border-destructive")}
            {...register("targetWordCount")}
          />
          {errors.targetWordCount && (
            <p className="text-sm text-destructive">
              {errors.targetWordCount.message}
            </p>
          )}
        </div>
      )}

      {showPageCount && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor="targetPageCount">Target page count</Label>
            <TargetHint format={format} />
          </div>
          <Input
            id="targetPageCount"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 100"
            className={cn(errors.targetPageCount && "border-destructive")}
            {...register("targetPageCount")}
          />
          {errors.targetPageCount && (
            <p className="text-sm text-destructive">
              {errors.targetPageCount.message}
            </p>
          )}
        </div>
      )}

      {!showWordCount && !showPageCount && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            No count target for this format. Set a deadline below if useful.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="date"
          className={cn(
            "w-fit",
            errors.deadline && "border-destructive",
          )}
          {...register("deadline")}
        />
        {errors.deadline && (
          <p className="text-sm text-destructive">{errors.deadline.message}</p>
        )}
      </div>
    </div>
  );
}
