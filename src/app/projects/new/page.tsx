"use client";

import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createProject } from "@/lib/db-helpers";
import { useNewProjectStore } from "@/stores/new-project-store";
import type { WizardValues } from "@/stores/new-project-store";
import type { Format, Methodology } from "@/lib/db";
import { StepBasics } from "./_components/step-basics";
import { StepShape } from "./_components/step-shape";
import { StepTargets } from "./_components/step-targets";

const FORMATS = ["novel", "screenplay", "short-story", "stage-play", "tv-pilot"];
const METHODOLOGIES = ["three-act", "save-the-cat", "heros-journey", "freeform"];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  logline: z.string(),
  format: z
    .string()
    .refine((v) => FORMATS.includes(v), "Please select a format"),
  methodology: z
    .string()
    .refine((v) => METHODOLOGIES.includes(v), "Please select a methodology"),
  targetWordCount: z
    .string()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && parseInt(v, 10) > 0),
      "Must be a positive whole number",
    ),
  targetPageCount: z
    .string()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && parseInt(v, 10) > 0),
      "Must be a positive whole number",
    ),
  deadline: z.string(),
});

const STEP_NAMES = ["The Basics", "The Shape", "Targets"] as const;

type StepNum = 1 | 2 | 3;

function StepIndicator({ step }: { step: StepNum }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {STEP_NAMES.map((name, i) => {
        const n = (i + 1) as StepNum;
        const isActive = step === n;
        const isDone = step > n;
        return (
          <div key={name} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isDone &&
                    "bg-primary text-primary-foreground",
                  isActive &&
                    "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                  !isActive &&
                    !isDone &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? "✓" : n}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {name}
              </span>
            </div>
            {i < STEP_NAMES.length - 1 && (
              <div
                className={cn(
                  "mb-5 mx-3 h-px w-16",
                  step > n ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const store = useNewProjectStore();
  const step = store.step;

  const form = useForm<WizardValues>({
    resolver: zodResolver(schema),
    defaultValues: store.savedValues,
    mode: "onTouched",
  });

  const {
    watch,
    formState: { isSubmitting },
  } = form;

  const title = watch("title");
  const format = watch("format");
  const methodology = watch("methodology");

  const canAdvance =
    step === 1
      ? !!title?.trim() && !!format
      : step === 2
        ? !!methodology
        : true;

  const handleBack = () => {
    store.saveValues(form.getValues());
    store.setStep((step - 1) as StepNum);
  };

  const handleNext = async () => {
    const fields: (keyof WizardValues)[] =
      step === 1 ? ["title", "format"] : ["methodology"];
    const valid = await form.trigger(fields);
    if (!valid) return;

    // Pre-fill step 3 count targets when first entering step 3
    if (step === 2) {
      const fmt = form.getValues("format");
      const wc = form.getValues("targetWordCount");
      const pc = form.getValues("targetPageCount");
      if (!wc && !pc) {
        if (fmt === "novel") form.setValue("targetWordCount", "80000");
        else if (fmt === "short-story") form.setValue("targetWordCount", "5000");
        else if (fmt === "screenplay") form.setValue("targetPageCount", "100");
        else if (fmt === "tv-pilot") form.setValue("targetPageCount", "55");
        else if (fmt === "stage-play") form.setValue("targetPageCount", "90");
      }
    }

    store.saveValues(form.getValues());
    store.setStep((step + 1) as StepNum);
  };

  const handleCreate = async (values: WizardValues) => {
    try {
      const wordCount = values.targetWordCount
        ? parseInt(values.targetWordCount, 10)
        : undefined;
      const pageCount = values.targetPageCount
        ? parseInt(values.targetPageCount, 10)
        : undefined;
      const deadline = values.deadline
        ? new Date(values.deadline).getTime()
        : undefined;

      const id = await createProject({
        title: values.title.trim(),
        logline: values.logline?.trim() || undefined,
        format: values.format as Format,
        methodology: values.methodology as Methodology,
        targetWordCount:
          wordCount && !isNaN(wordCount) ? wordCount : undefined,
        targetPageCount:
          pageCount && !isNaN(pageCount) ? pageCount : undefined,
        deadline,
      });

      store.reset();
      router.push(`/projects/${id}`);
    } catch {
      toast.error("Failed to create project. Please try again.");
    }
  };

  const handleCancel = () => {
    store.reset();
    router.push("/");
  };

  return (
    <div className="flex min-h-full items-start justify-center p-6 pt-12">
      <div className="w-full max-w-3xl">
        <StepIndicator step={step} />

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} noValidate>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-card-foreground">
                {STEP_NAMES[step - 1]}
              </h2>
              <div className="mb-5 h-px bg-border" />
              {step === 1 && <StepBasics />}
              {step === 2 && <StepShape />}
              {step === 3 && <StepTargets />}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canAdvance}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating…" : "Create Project"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
