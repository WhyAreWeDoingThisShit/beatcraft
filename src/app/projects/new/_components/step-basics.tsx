"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  BookOpen,
  Film,
  FileText,
  Mic2,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardValues } from "@/stores/new-project-store";

const FORMATS = [
  {
    value: "novel",
    label: "Novel",
    icon: BookOpen,
    description: "Long-form prose fiction. Full character arcs and world.",
  },
  {
    value: "screenplay",
    label: "Screenplay",
    icon: Film,
    description: "Feature film script. Visual, compressed, scene-driven.",
  },
  {
    value: "short-story",
    label: "Short Story",
    icon: FileText,
    description: "Single sitting. One idea, one arc, no fat.",
  },
  {
    value: "stage-play",
    label: "Stage Play",
    icon: Mic2,
    description: "For the stage. Dialogue and presence over description.",
  },
  {
    value: "tv-pilot",
    label: "TV Pilot",
    icon: Tv,
    description: "Episode one of a series. Establish the world and the hook.",
  },
] as const;

export function StepBasics() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<WizardValues>();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Working title is fine"
          autoComplete="off"
          autoFocus
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Logline */}
      <div className="space-y-1.5">
        <Label htmlFor="logline">Logline</Label>
        <Textarea
          id="logline"
          placeholder="A [protagonist] must [goal] or else [stakes]."
          rows={2}
          className="resize-none"
          {...register("logline")}
        />
      </div>

      {/* Format */}
      <div className="space-y-2">
        <Label>
          Format <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="format"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FORMATS.map(({ value, label, icon: Icon, description }) => {
                const selected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          selected ? "text-foreground" : "text-foreground/80",
                        )}
                      >
                        {label}
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed">
                        {description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.format && (
          <p className="text-sm text-destructive">{errors.format.message}</p>
        )}
      </div>
    </div>
  );
}
