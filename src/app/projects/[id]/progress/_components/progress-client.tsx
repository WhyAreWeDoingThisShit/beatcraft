"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import {
  useLiveBeats,
  useLiveProject,
  useLiveActivityLog,
} from "@/lib/use-live"
import { logActivity } from "@/lib/db-helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ActivityLog, Beat } from "@/lib/db"

// ─── helpers ──────────────────────────────────────────────────────────────────

function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function computeStreaks(
  activityByDay: Map<string, number>,
): { current: number; longest: number } {
  const todayStr = toLocalDate(new Date())
  const hasToday = (activityByDay.get(todayStr) ?? 0) > 0

  // current streak: count back from today (or yesterday if today not yet logged)
  let current = 0
  const startOffset = hasToday ? 0 : 1
  for (let i = startOffset; ; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = toLocalDate(d)
    if ((activityByDay.get(key) ?? 0) > 0) {
      current++
    } else {
      break
    }
  }

  // longest streak: walk sorted active days
  const activeDays = Array.from(activityByDay.keys())
    .filter((day) => (activityByDay.get(day) ?? 0) > 0)
    .sort()

  let streak = 0
  let longest = 0
  for (let i = 0; i < activeDays.length; i++) {
    if (i === 0) {
      streak = 1
    } else {
      // use noon times to sidestep DST edge cases
      const prev = new Date(activeDays[i - 1] + "T12:00:00")
      const curr = new Date(activeDays[i] + "T12:00:00")
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / 86_400_000,
      )
      streak = diffDays === 1 ? streak + 1 : 1
    }
    longest = Math.max(longest, streak)
  }

  return { current, longest }
}

function heatmapIntensity(score: number): string {
  if (score === 0) return "bg-muted"
  if (score < 100) return "bg-green-200 dark:bg-green-900"
  if (score < 300) return "bg-green-400 dark:bg-green-700"
  if (score < 600) return "bg-green-600 dark:bg-green-500"
  return "bg-green-800 dark:bg-green-400"
}

// ─── Status bar ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  done: { label: "Done", bar: "bg-green-500" },
  drafted: { label: "Drafted", bar: "bg-blue-500" },
  untouched: { label: "Untouched", bar: "bg-slate-300 dark:bg-slate-600" },
  skipped: { label: "Skipped", bar: "bg-slate-400/50 dark:bg-slate-500/50" },
} as const

function StructuralProgressBar({ beats }: { beats: Beat[] }) {
  const total = beats.length

  const counts = useMemo(() => {
    const c = { done: 0, drafted: 0, untouched: 0, skipped: 0 }
    for (const b of beats) c[b.status]++
    return c
  }, [beats])

  const draftedOrDone = counts.done + counts.drafted

  if (total === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No beats yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Structural progress</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <TooltipProvider>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {(
                ["done", "drafted", "untouched", "skipped"] as const
              ).map((status) => {
                const pct = (counts[status] / total) * 100
                if (pct === 0) return null
                return (
                  <Tooltip key={status}>
                    <TooltipTrigger
                      render={
                        <div
                          className={`${STATUS_CONFIG[status].bar} h-full cursor-default transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      }
                    />
                    <TooltipContent>
                      {STATUS_CONFIG[status].label}: {counts[status]} beats (
                      {Math.round(pct)}%)
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
          <div className="mt-2 flex flex-wrap gap-3">
            {(["done", "drafted", "untouched", "skipped"] as const).map(
              (s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${STATUS_CONFIG[s].bar}`}
                  />
                  {STATUS_CONFIG[s].label} ({counts[s]})
                </span>
              ),
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-2xl font-bold tabular-nums">
            {draftedOrDone}
          </span>
          <span className="text-sm text-muted-foreground"> / {total}</span>
          <p className="text-xs text-muted-foreground">drafted or done</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Word count ───────────────────────────────────────────────────────────────

function WordCountCard({
  beats,
  targetWordCount,
}: {
  beats: Beat[]
  targetWordCount?: number
}) {
  const totalActual = useMemo(
    () => beats.reduce((s, b) => s + (b.wordCountActual ?? 0), 0),
    [beats],
  )
  const totalBeatTarget = useMemo(
    () => beats.reduce((s, b) => s + (b.wordCountTarget ?? 0), 0),
    [beats],
  )

  const effectiveTarget = targetWordCount ?? totalBeatTarget

  return (
    <Card>
      <CardHeader>
        <CardTitle>Word count</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {effectiveTarget === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a target in project settings.
          </p>
        ) : (
          <>
            {(() => {
              const pct = Math.min(
                100,
                Math.round((totalActual / effectiveTarget) * 100),
              )
              return (
                <>
                  <div className="flex justify-between text-sm">
                    <span>
                      {totalActual.toLocaleString()} /{" "}
                      {effectiveTarget.toLocaleString()} words · {pct}% complete
                    </span>
                  </div>
                  <Progress value={pct} />
                </>
              )
            })()}
            <p className="text-xs text-muted-foreground">
              Self-reported. Edit per-beat on the board.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Activity heatmap ─────────────────────────────────────────────────────────

function ActivityHeatmap({
  projectId,
  activityLog,
}: {
  projectId: string
  activityLog: ActivityLog[]
}) {
  const [logOpen, setLogOpen] = useState(false)
  const [wordsField, setWordsField] = useState("")
  const [beatsField, setBeatsField] = useState("0")
  const [submitting, setSubmitting] = useState(false)

  const activityByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const entry of activityLog) {
      m.set(
        entry.day,
        (entry.wordsWritten ?? 0) + (entry.beatsCompleted ?? 0) * 250,
      )
    }
    return m
  }, [activityLog])

  const { current: currentStreak, longest: longestStreak } = useMemo(
    () => computeStreaks(activityByDay),
    [activityByDay],
  )

  // 12-week grid: columns=weeks (oldest→newest), rows=Sun–Sat
  const weeks = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const todayStr = toLocalDate(today)

    const startDate = new Date(today)
    startDate.setDate(today.getDate() - today.getDay() - 11 * 7)

    const grid: Array<
      Array<{ date: string; score: number; isFuture: boolean }>
    > = []
    const cur = new Date(startDate)

    for (let w = 0; w < 12; w++) {
      const week: (typeof grid)[0] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = toLocalDate(cur)
        week.push({
          date: dateStr,
          score: activityByDay.get(dateStr) ?? 0,
          isFuture: dateStr > todayStr,
        })
        cur.setDate(cur.getDate() + 1)
      }
      grid.push(week)
    }
    return grid
  }, [activityByDay])

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault()
    const w = Math.max(0, parseInt(wordsField) || 0)
    const b = Math.max(0, parseInt(beatsField) || 0)
    setSubmitting(true)
    try {
      await logActivity(projectId, w, b)
      setLogOpen(false)
      setWordsField("")
      setBeatsField("0")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle>Activity</CardTitle>
        <Button size="sm" onClick={() => setLogOpen(true)}>
          Log today
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Start logging to see your streak.
          </p>
        ) : (
          <div className="flex gap-6">
            <div>
              <span className="text-2xl font-bold tabular-nums">
                {currentStreak}
              </span>
              <span className="ml-1.5 text-sm text-muted-foreground">
                day streak
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold tabular-nums">
                {longestStreak}
              </span>
              <span className="ml-1.5 text-sm text-muted-foreground">
                best
              </span>
            </div>
          </div>
        )}

        <TooltipProvider>
          <div className="flex gap-1" aria-label="Activity heatmap">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell) => (
                  <Tooltip key={cell.date}>
                    <TooltipTrigger
                      render={
                        <div
                          className={`h-3 w-3 rounded-sm ${
                            cell.isFuture
                              ? "bg-muted/40"
                              : heatmapIntensity(cell.score)
                          }`}
                        />
                      }
                    />
                    <TooltipContent>
                      {cell.date}:{" "}
                      {cell.score > 0 ? `${cell.score} pts` : "no activity"}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log today</DialogTitle>
          </DialogHeader>
          <form
            id="log-today-form"
            onSubmit={handleLogSubmit}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="log-words">Words written</Label>
              <Input
                id="log-words"
                type="number"
                min={0}
                placeholder="0"
                value={wordsField}
                onChange={(e) => setWordsField(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-beats">Beats completed</Label>
              <Input
                id="log-beats"
                type="number"
                min={0}
                value={beatsField}
                onChange={(e) => setBeatsField(e.target.value)}
              />
            </div>
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="log-today-form"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Beat table ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  drafted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  untouched: "bg-muted text-muted-foreground",
  skipped: "bg-muted text-muted-foreground line-through",
}

function BeatTable({
  projectId,
  beats,
}: {
  projectId: string
  beats: Beat[]
}) {
  const [open, setOpen] = useState(true)

  return (
    <Card>
      <CardHeader
        className="flex cursor-pointer flex-row items-center gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        )}
        <CardTitle>Beat breakdown</CardTitle>
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          {beats.length} beats
        </span>
      </CardHeader>
      {open && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    Act
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                    Words
                  </th>
                </tr>
              </thead>
              <tbody>
                {beats.map((beat) => (
                  <tr
                    key={beat.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/projects/${projectId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {beat.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {beat.act ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[beat.status] ?? ""}`}
                      >
                        {beat.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {beat.wordCountActual != null ||
                      beat.wordCountTarget != null ? (
                        <>
                          {(beat.wordCountActual ?? 0).toLocaleString()}
                          {beat.wordCountTarget
                            ? ` / ${beat.wordCountTarget.toLocaleString()}`
                            : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function ProgressClient({ projectId }: { projectId: string }) {
  const project = useLiveProject(projectId)
  const beats = useLiveBeats(projectId)
  const activityLog = useLiveActivityLog(projectId)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{project?.title ?? "…"}</h1>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Board
        </Link>
      </div>

      <StructuralProgressBar beats={beats} />
      <WordCountCard beats={beats} targetWordCount={project?.targetWordCount} />
      <ActivityHeatmap projectId={projectId} activityLog={activityLog} />
      <BeatTable projectId={projectId} beats={beats} />
    </div>
  )
}
