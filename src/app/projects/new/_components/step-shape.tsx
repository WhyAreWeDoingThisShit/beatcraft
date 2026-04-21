"use client";

import { useFormContext, Controller } from "react-hook-form";
import { AlignLeft, ListChecks, Compass, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { SCAFFOLD_TITLES } from "@/lib/scaffold-titles";
import type { WizardValues } from "@/stores/new-project-store";
import type { Methodology } from "@/lib/db";

const METHODOLOGIES = [
  {
    value: "three-act" as Methodology,
    label: "3-Act Structure",
    icon: AlignLeft,
    description:
      "The universal skeleton. Three movements: setup, confrontation, resolution. Good default if you're not sure.",
  },
  {
    value: "save-the-cat" as Methodology,
    label: "Save the Cat",
    icon: ListChecks,
    description:
      "Blake Snyder's 15 beats. Precise, punchy, popular in screenwriting and commercial fiction.",
  },
  {
    value: "heros-journey" as Methodology,
    label: "Hero's Journey",
    icon: Compass,
    description:
      "Campbell/Vogler's 12 stages. Strong for mythic, transformational, or quest stories.",
  },
  {
    value: "freeform" as Methodology,
    label: "Freeform",
    icon: PenLine,
    description: "No scaffold. Start empty and add beats as you go.",
  },
] as const;

function BeatPreviewPanel({ methodology }: { methodology: Methodology | "" }) {
  if (!methodology) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-4">
        <p className="text-center text-sm text-muted-foreground">
          Select a methodology to see your beats.
        </p>
      </div>
    );
  }

  const beats = SCAFFOLD_TITLES[methodology];

  if (beats.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">What you&rsquo;ll get</p>
        <p className="mt-3 text-sm text-muted-foreground">
          A blank canvas. No beats — you build the structure yourself.
        </p>
      </div>
    );
  }

  // Group by act
  const groups: { act: string; titles: string[] }[] = [];
  for (const beat of beats) {
    const actLabel = beat.act ?? "Beats";
    const last = groups[groups.length - 1];
    if (last?.act === actLabel) {
      last.titles.push(beat.title);
    } else {
      groups.push({ act: actLabel, titles: [beat.title] });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        What you&rsquo;ll get
      </p>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.act}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.act}
            </p>
            <ul className="space-y-0.5">
              {group.titles.map((title) => (
                <li key={title} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        You can change, reorder, or delete any beat later — and switch to Freeform anytime.
      </p>
    </div>
  );
}

export function StepShape() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const methodology = watch("methodology") as Methodology | "";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: methodology selection */}
      <div className="space-y-3">
        <Label>
          Methodology <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="methodology"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              {METHODOLOGIES.map(({ value, label, icon: Icon, description }) => {
                const selected = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        {errors.methodology && (
          <p className="text-sm text-destructive">{errors.methodology.message}</p>
        )}
      </div>

      {/* Right: beat preview */}
      <div className="lg:pt-6">
        <BeatPreviewPanel methodology={methodology} />
      </div>
    </div>
  );
}
