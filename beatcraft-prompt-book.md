# Beatcraft — Prompt Book for a Writing Planner PWA

A staged build guide for an AI coding assistant (Claude Code, Cursor, etc.). Each **Context Window** is a self-contained prompt you can paste in order. The app's working name is **Beatcraft** — rename freely.

---

## 0. Product Brief (read first, don't paste)

**What it is.** A writing *planner* (not an editor) that knows your format and methodology. You pick a format (novel, screenplay, short story, stage play, TV pilot) and optionally a methodology (3-act, Save the Cat, Hero's Journey). The app scaffolds a project with the right beat structure — each beat carrying a real craft prompt, not a blank card. Alongside the beats sits a light wiki (characters, places) and a progress view.

**Design stance: opinionated but not rigid.** Default scaffolds are strong. Users can reorder, add, delete, or detach from a methodology entirely (becomes "Freeform"). No paywalls, no AI generation, no writing surface — users draft elsewhere.

**Primary user.** Someone between "pantser" and "architect" who wants structure without a 400-page craft book. The person with three half-finished Scrivener files.

**Stack (locked).**
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui + lucide-react
- Dexie.js for IndexedDB (local-first, no server in v1)
- Zustand for cross-component state
- @serwist/next for PWA / service worker (next-pwa is unmaintained for App Router)
- react-hook-form + zod
- @dnd-kit for beat reordering
- pnpm, Vercel hosting, GitHub source, GitHub Actions CI

**Non-goals for v1.** No cloud sync, no accounts, no backend. No rich-text writing surface. No LLM calls — prompts are static and hand-authored. No collaboration.

---

# Context Window 1 — Repo, Scaffold, PWA Shell

**Goal:** a deployable empty app on Vercel, installable as a PWA, with the design system wired up.

**Do the following:**

1. Initialize a Next.js 15 app with TypeScript, Tailwind, ESLint, App Router, `src/` directory, import alias `@/*`. Use pnpm.
2. Add dependencies: `dexie`, `dexie-react-hooks`, `zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `lucide-react`, `date-fns`, `nanoid`, `clsx`, `tailwind-merge`, `next-themes`, `jszip`.
3. Install and init shadcn/ui with the "Slate" base color and CSS variables. Pre-install: `button`, `card`, `dialog`, `dropdown-menu`, `input`, `textarea`, `label`, `select`, `tabs`, `badge`, `separator`, `sonner`, `progress`, `tooltip`, `sheet`.
4. Install `@serwist/next` and `serwist`. Configure a service worker at `src/app/sw.ts` using Serwist's `defaultCache` precaching. Update `next.config.ts` with `withSerwist`. Expose an offline fallback page at `/offline`.
5. Create `public/manifest.webmanifest` with name "Beatcraft", short_name "Beatcraft", theme_color `#0f172a`, background_color `#0f172a`, display `standalone`, start_url `/`. Generate 192×192 and 512×512 icons (placeholder monogram "B" on slate).
6. Wire the manifest via the App Router metadata API in `src/app/layout.tsx`. Add appropriate `<meta name="theme-color">` and `apple-touch-icon` links.
7. Build the top-level layout: collapsible left rail for project switcher, main content area, global `Toaster` from sonner. Dark mode by default with a light toggle.
8. Route `/`: if no projects exist, empty-state CTA "Start a new project". If projects exist, redirect to `/projects/[mostRecentId]`.
9. Create `.github/workflows/ci.yml` that runs on push/PR to `main`: install, typecheck (`tsc --noEmit`), lint, build.
10. Init git, commit, create GitHub repo, push `main`. Add README with local dev instructions.

**Acceptance criteria.** `pnpm dev` and `pnpm build` succeed. PWA install prompt appears in Chrome DevTools > Application. Service worker registers; `/offline` works when network is killed. Dark mode default; toggle persists. CI passes on first push. Vercel preview is green.

Stop here. No features yet.

---

# Context Window 2 — Data Model & Local Persistence

**Goal:** a typed, versioned Dexie database with seed helpers.

**Do the following:**

1. Create `src/lib/db.ts` with a Dexie database called `BeatcraftDB`, version 1. Use `nanoid()` for ids.

```ts
type Format = 'novel' | 'screenplay' | 'short-story' | 'stage-play' | 'tv-pilot';
type Methodology = 'three-act' | 'save-the-cat' | 'heros-journey' | 'freeform';
type BeatStatus = 'untouched' | 'drafted' | 'done' | 'skipped';

interface Project {
  id: string;
  title: string;
  logline?: string;
  format: Format;
  methodology: Methodology;
  targetWordCount?: number;
  targetPageCount?: number;
  deadline?: number;
  createdAt: number;
  updatedAt: number;
}

interface Beat {
  id: string;
  projectId: string;
  order: number;        // fractional ordering (e.g., 1000, 1500, 2000)
  act?: string;         // methodology-specific group label
  title: string;
  prompt: string;       // craft prompt shown in the card
  body: string;         // user's notes
  status: BeatStatus;
  wordCountTarget?: number;
  wordCountActual?: number;
  linkedCharacterIds: string[];
  linkedPlaceIds: string[];
  isCustom: boolean;
}

interface Character {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  want?: string;
  need?: string;
  flaw?: string;
  notes: string;
  color?: string;
  createdAt: number;
}

interface Place {
  id: string;
  projectId: string;
  name: string;
  kind?: string;
  description: string;
  notes: string;
  createdAt: number;
}

interface ActivityLog {
  id: string;
  projectId: string;
  day: string;          // YYYY-MM-DD
  wordsWritten: number;
  beatsCompleted: number;
}
```

2. Indexes: `projects` by `updatedAt`; `beats` by `[projectId+order]`; `characters` and `places` by `projectId`; `activityLog` by `[projectId+day]` unique.

3. Create `src/lib/db-helpers.ts` with transactional functions:
   - `createProject(input)` — also scaffolds beats based on methodology (stub as `[]` for now; Window 4 fills in content)
   - `deleteProject(id)` — cascades to beats, characters, places, activityLog
   - `listProjects`, `getProject`
   - `listBeats(projectId)` ordered by `order` ascending
   - `reorderBeat(beatId, newOrder)` — caller computes midpoint between neighbors
   - `upsertBeat`, `deleteBeat`, `setBeatStatus`
   - `listCharacters`, `createCharacter`, `updateCharacter`, `deleteCharacter` (also unlinks from all beats)
   - `listPlaces`, `createPlace`, `updatePlace`, `deletePlace` (also unlinks)
   - `logActivity(projectId, wordsWritten, beatsCompleted)` — upserts today's row, adds to existing counts

4. Create `src/lib/use-live.ts` — typed wrappers around `dexie-react-hooks`'s `useLiveQuery`: `useLiveProjects()`, `useLiveBeats(projectId)`, etc.

5. Dev-only seed button at `/settings/dev` that creates two demo projects. Gate with `process.env.NODE_ENV === 'development'`.

6. Add `src/lib/io.ts`:
   - `exportProject(projectId): Promise<Blob>` — bundles project + beats + characters + places into one JSON
   - `importProject(file: File): Promise<string>` — returns new project id; regenerates all ids to avoid collisions

**Acceptance criteria.** DevTools shows `BeatcraftDB` schema. CRUD helpers work under a vitest smoke test (write one for `createProject` + `listProjects`). Fractional reordering: inserting between order 1000 and 2000 with order 1500 appears in the right slot with no resequencing. Export → delete → import round-trips cleanly.

---

# Context Window 3 — Project Creation Flow

**Goal:** a 3-step wizard that asks the right questions and scaffolds a real project.

**Do the following:**

1. Route: `/projects/new`. Build a 3-step stepper. Persist partial state in a Zustand store so back/forward doesn't lose input.

2. **Step 1 — The Basics.**
   - Title (required)
   - Logline (optional, helper: "A [protagonist] must [goal] or else [stakes].")
   - Format (required): radio cards with icon + short description for Novel, Screenplay, Short Story, Stage Play, TV Pilot.

3. **Step 2 — The Shape.**
   - Methodology (required): radio cards.
     - **3-Act Structure** — "The universal skeleton. Three movements: setup, confrontation, resolution. Good default if you're not sure."
     - **Save the Cat** — "Blake Snyder's 15 beats. Precise, punchy, popular in screenwriting and commercial fiction."
     - **Hero's Journey** — "Campbell/Vogler's 12 stages. Strong for mythic, transformational, or quest stories."
     - **Freeform** — "No scaffold. Start empty and add beats as you go."
   - Live "What you'll get" preview panel showing the beat list for the selected methodology (titles only, read-only).
   - Note: "You can change, reorder, or delete any beat later — and switch to Freeform anytime."

4. **Step 3 — Targets (optional).**
   - For novel/short-story: target word count with defaults (novel: 80000, short story: 5000).
   - For screenplay/TV pilot/stage play: target page count (feature: 100, hour pilot: 55, full stage play: 90).
   - Deadline (optional date).

5. On finish: call `createProject(...)`, which scaffolds beats per methodology (content in Window 4). Navigate to `/projects/[id]`.

6. Validation with zod + react-hook-form. Inline errors. Primary button disabled until step is valid.

7. Aborting `/projects/new` creates no partial project — store is ephemeral.

**Acceptance criteria.** Wizard completable in under 60 seconds. Preview updates instantly on methodology change. Returning to Step 1 preserves choices until explicit cancel. Invalid inputs block progress with clear messages. Completion creates a project and routes to it.

---

# Context Window 4 — Beat Scaffolds and Beat Cards

**Goal:** each methodology ships with real, opinionated craft prompts. Beats render as a board with drag-and-drop reordering.

## Part A — Beat Scaffold Data

Create `src/lib/scaffolds.ts` exporting `BEAT_SCAFFOLDS: Record<Methodology, Array<{ act?: string; title: string; prompt: string; wordCountTargetFraction?: number }>>`. Use `wordCountTargetFraction` so the scaffold distributes the project's target across beats proportionally.

**Use these prompts exactly — they're the product. Do not paraphrase.**

### `three-act`

**Act I — Setup**
1. **Opening Image** — "Write the first concrete image a reader/viewer meets. What does it say — without telling — about the world, the tone, and the protagonist's current shape? This image should be answerable, later, by the Final Image."
2. **Inciting Incident** — "What specific event breaks the status quo and forces the protagonist to choose? Not a feeling — an event. Where were they standing. Who spoke. What arrived."
3. **First Plot Point** — "The protagonist commits. Door closes behind them. What is the new question the story is now asking that it wasn't asking on page one?"

**Act II — Confrontation**
4. **Rising Action / First Pinch** — "List three escalating complications. The third should cost the protagonist something they didn't know they valued."
5. **Midpoint** — "Something the protagonist believed on page one is now false. What is it, and what replaces it? This is not a twist for the reader — it's a twist for the character."
6. **Second Pinch / All Is Lost** — "Strip the protagonist of their best asset, their ally, or their hope — pick one. Describe the moment they realize it's gone."

**Act III — Resolution**
7. **Climax** — "The protagonist confronts the story's central question with everything they've become. What is the choice only this person, having lived this story, could now make?"
8. **Resolution / Final Image** — "Mirror the Opening Image. What has changed? Resist wrapping everything — leave one thread for the reader to carry out."

### `save-the-cat`

**Act One**
1. **Opening Image** — "A one-image snapshot of your protagonist's 'before.' Mood, tone, status quo. It must be payable by the Final Image."
2. **Theme Stated** — "Somewhere in the first 5% of the story, a minor character speaks the theme aloud — usually to a protagonist who isn't ready to hear it. Write that line."
3. **Set-Up** — "Show the protagonist's life and the three things that must change by the end. Plant them now; you'll collect later."
4. **Catalyst** — "An external event shatters the status quo. Not internal — external. What happens to them?"
5. **Debate** — "Why not? For a full act break, the protagonist resists. Write the three reasons they give themselves."
6. **Break into Two** — "They choose. Proactive, not forced. What is the concrete action that crosses them into the new world?"

**Act Two A**
7. **B Story** — "A new character or relationship arrives, often carrying the theme. Who shows up, and what do they force the protagonist to confront?"
8. **Fun and Games** — "The 'promise of the premise.' If this is a body-swap comedy, this is where we swap. Deliver the marquee pleasure of your hook."
9. **Midpoint** — "A false victory or false defeat. The stakes are raised. Public-facing A-story collides with private-facing B-story for the first time."

**Act Two B**
10. **Bad Guys Close In** — "External antagonists advance; internal doubts metastasize. List both columns."
11. **All Is Lost** — "The 'whiff of death.' Something (or someone) ends. Mentor dies, dream collapses, mask falls. What dies here?"
12. **Dark Night of the Soul** — "The protagonist at rock bottom. Not plot — interiority. What belief must they abandon to go on?"
13. **Break into Three** — "A solution arrives, usually from the B-story. What does the protagonist now understand that they didn't at the Midpoint?"

**Act Three**
14. **Finale** — "Five-part structure: gather the team, execute the plan, high tower surprise, dig deep down, execution of the new plan. Sketch each."
15. **Final Image** — "Mirror Opening Image. What has changed in the frame? The delta is your story's meaning."

### `heros-journey`

**Departure**
1. **Ordinary World** — "Show the hero's normal life with enough texture that we feel its pull. What is the one thing they'd miss most? Plant it."
2. **Call to Adventure** — "A disturbance or invitation. It should feel inevitable in retrospect but surprising in the moment."
3. **Refusal of the Call** — "Why not? The refusal isn't cowardice — it's the hero's current identity defending itself."
4. **Meeting the Mentor** — "A figure who gives the hero a gift: knowledge, a tool, confidence, or all three. The gift should matter later."
5. **Crossing the Threshold** — "The point of no return. What is physically different about the world past this line?"

**Initiation**
6. **Tests, Allies, Enemies** — "Three encounters that teach the rules of the new world. Each should reveal something about the hero they didn't know."
7. **Approach to the Inmost Cave** — "Preparation before the great ordeal. Dread as atmosphere. What does the hero fear is about to be demanded of them?"
8. **The Ordeal** — "The hero faces their greatest fear — and symbolically dies. What part of their old self does not survive this scene?"
9. **Reward (Seizing the Sword)** — "They take something: an object, knowledge, a truth, a commitment. It is not yet safe. What's the cost they haven't paid yet?"

**Return**
10. **The Road Back** — "The hero recommits to the ordinary world. An enemy or consequence follows them home."
11. **Resurrection** — "A final test where the hero uses everything they've learned. The old self is tested one last time — and fails, so the new self can act."
12. **Return with the Elixir** — "They return changed, carrying a gift for the community. What is it, and who specifically is healed by it?"

### `freeform`
Return an empty array. User builds their own.

## Part B — Beat Card UI

1. Route: `/projects/[id]` — main board.
2. Layout: beats grouped by `act` (if set) as collapsible sections; each beat is a card. If Freeform, a single ungrouped list.
3. **Beat card** shows: title (inline-editable), status chip (click to cycle: untouched → drafted → done → skipped), word-count progress bar if targets exist, linked character/place chips, preview of first ~120 chars of `body`. Click opens a full drawer (Sheet) with:
   - Title
   - The static `prompt` as a distinctive quote block — serif typeface, muted color, a subtle left border. It should feel like something to read, not a form label.
   - Large `textarea` for `body` (auto-saving on blur, debounced)
   - Status selector
   - Word count actual (number input)
   - Multi-select chips for linking characters and places
   - Delete (with confirm)
4. **Drag and drop** with `@dnd-kit/sortable`. New `order` = midpoint between neighbors; if edge, use `prev + 1000` or `next - 1000`.
5. **Add beat** per act group: inserts a custom beat at the end with empty prompt and `title: "New beat"`, `isCustom: true`.
6. **Reset to scaffold** (board settings menu): re-seeds beats from the methodology scaffold. Hard confirm. Offer two modes: "discard customs" and "keep customs" (appends customs at the end).
7. **Detach from methodology**: converts project to `freeform`. Beats remain but lose `act` grouping. Soft confirm.

**Acceptance criteria.** A fresh Save the Cat project shows 15 beats in three act groups with the exact prompts above. Drag-and-drop persists across reloads. Editing body saves on blur without a save button. Status chip color-codes: untouched (muted gray), drafted (blue), done (green), skipped (dashed border, low opacity). "Reset to scaffold" with "discard customs" restores exactly the seeded list.

---

# Context Window 5 — The Wiki (Characters & Places)

**Goal:** a light, fast reference that beats can link to — not Notion.

**Do the following:**

1. Route: `/projects/[id]/wiki`. Two tabs: Characters | Places.

2. **Characters tab.**
   - Grid of cards: avatar (initials on a colored circle, color stored on character), name, role.
   - Click opens an edit drawer: Name, Role (free text with autocomplete: Protagonist, Antagonist, Deuteragonist, Mentor, Ally, Love Interest, Foil, Mirror), Want, Need, Flaw, Notes, Color (pill picker, 8 palette choices).
   - Inline helper text for the want/need/flaw trio:
     - Want: "The external, concrete goal — what they'd say they want."
     - Need: "The internal truth they must learn — what the story knows they need."
     - Flaw: "The specific way they get in their own way."
   - "New character" button. Inline search/filter.

3. **Places tab.**
   - Same pattern: grid → edit drawer.
   - Fields: Name, Kind (Room, Building, City, Region, Dreamscape, Other), Description, Notes.

4. **Linking from beats.** On a beat drawer, the character/place selectors query this wiki live. Linking stores ids on the beat. Deleting a character/place removes their ids from all beats.

5. **Cross-reference view.** On a character's drawer, show a read-only "Appears in" list of beats linked to this character. Same for places. Click jumps to the beat.

6. **Keyboard.** `/` focuses wiki search. `N` creates a new entity on the active tab.

**Acceptance criteria.** Adding a character and linking from two beats: the character page lists both beats. Deleting a character cleans up all links (verify in DB). Grid renders smoothly with 50+ entities — use `content-visibility: auto` or virtualization if needed.

---

# Context Window 6 — Progress Dashboard

**Goal:** a glanceable view that answers: *how far am I, and am I moving?*

**Do the following:**

1. Route: `/projects/[id]/progress`.

2. **Top strip — Structural progress.**
   - Horizontal stacked bar showing percentage of beats by status (done / drafted / untouched / skipped). Tooltip on hover with counts.
   - Big number beside bar: "X of Y beats drafted or done".

3. **Word count (if targets are set).**
   - Sum `wordCountActual` vs `targetWordCount`. Progress bar + `words / target · N% complete`.
   - Footnote: "Self-reported. Edit per-beat on the board."

4. **Activity.**
   - 12-week GitHub-style heatmap driven by `activityLog`. Each cell tints by `wordsWritten + (beatsCompleted * 250)`.
   - Current streak + longest streak counters.
   - "Log today" button opens a small dialog: words written today (number), beats completed today (auto-computed but editable). Submit calls `logActivity`.

5. **Beat-by-beat table (collapsible).**
   - Columns: Title, Act, Status, Words (actual/target), Last edited. Click row → jumps to beat on the board.

6. **Empty states.** No activity: heatmap says "Start logging to see your streak." No word targets: word-count card says "Add a target in project settings."

**Acceptance criteria.** Numbers update in real time as beats change status (via `useLiveQuery`). Heatmap reflects activity entries across days. All three sections render in under 100ms on a project with 50 beats.

---

# Context Window 7 — Polish, Export, and Ship

**Goal:** production-ready. Installable. Exportable. Fast.

**Do the following:**

1. **Project settings** at `/projects/[id]/settings`: edit title, logline, targets, deadline. Change methodology (with Reset scaffold implications made clear). Detach to Freeform. Export project (JSON). Delete project (double-confirm by typing title).

2. **Global settings** at `/settings`: theme toggle, import project, about/version/GitHub link, "Erase all data" (triple-confirm).

3. **Export formats beyond JSON.**
   - Markdown: one `.md` file with H1 title, H2 per act, H3 per beat (title, then prompt as blockquote, then body), followed by "Cast" and "Places" sections.
   - Zipped bundle of JSON + Markdown + `characters.json` + `places.json` using `jszip`.

4. **PWA polish.**
   - Install prompt UX: "Install app" button in header when `beforeinstallprompt` has fired; dismissible per-session.
   - Offline banner when `navigator.onLine === false`.
   - SW update flow: when a new SW is waiting, show a sonner toast "Update available — click to refresh" that calls `skipWaiting`.

5. **Accessibility pass.** Keyboard-reachable everywhere. Beat cards and drawers have proper ARIA (role, labelledby). WCAG AA color contrast in both themes. Focus-visible rings on all focusables.

6. **Performance.** Dynamic-import heavy components (dnd-kit contexts, drawers) so initial route is lean. Lighthouse targets: Performance ≥ 95, Accessibility ≥ 95, PWA installable.

7. **Shortcuts (discoverable via `?`).**
   - `g p` → projects list
   - `g b` → current project board
   - `g w` → wiki
   - `g r` → progress
   - `n` → new beat (board) / new entity (wiki)
   - `/` → focus search

8. **Empty states everywhere.** Every list has a purposeful empty state with the primary action inline.

9. **Copy pass.** Replace placeholder text. Tone: confident, warm, plainspoken. Not cute. Not corporate. Like a good editor.

10. **Deploy.** Production on Vercel with custom domain if the user has one. Protect `main` on GitHub, require CI green to merge. Add `CHANGELOG.md` with v0.1.0 entry.

**Acceptance criteria.** Install the PWA on iOS and Android; launch offline; navigate between routes; create a beat offline without errors. Export → delete → reimport with full fidelity. Lighthouse ≥ 95 across the board on main routes. Keyboard-only flow works: create project → add character → link to beat → mark beat done → check progress, mouse never touched.

---

## Appendix A — Prompts to Consider Later (not v1)

Character arc cards (separate from characters), one per character per project, linked to beats. A theme card per project with a standing prompt. Scene list for screenplay/TV-pilot formats, between beats and pages. Pomodoro + word-count session logger tied to `activityLog`. Sync via Supabase behind a feature flag — local-first stays the source of truth, cloud is a mirror.

## Appendix B — Guardrails for the Coding Assistant

**Do not** add an LLM-powered "generate this beat for me" feature. Beatcraft's value is the *prompt*, not the *answer*. **Do not** add a rich-text editor — plain text + paragraph breaks only. **Do not** introduce a backend in v1, even for auth. **Do** keep every default opinionated — if a choice would weaken the default, don't expose it in settings. **Do** prefer fewer screens with more on them over deep navigation.

## Appendix C — Visual Tone

Typography: a serif for beat prompts (Source Serif 4 or similar) to make them feel like something to be *read*. UI uses Tailwind's default sans. Palette: slate + indigo 500 in dark mode, slate + indigo 600 in light; status colors are the only other hues. Density: roomy — users sit with this tool. Motion: subtle — drawer slides, card lifts on hover, status transitions fade. No springy physics.

---

*End of prompt book. Feed Context Windows 1–7 in order, one per session. Don't let the assistant race ahead — the acceptance criteria are there to hold each stage honest.*
