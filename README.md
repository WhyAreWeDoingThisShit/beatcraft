# Beatcraft

A writing planner that knows your format and methodology. Pick a format (novel, screenplay, short story, stage play, TV pilot) and a methodology (3-act, Save the Cat, Hero's Journey) — Beatcraft scaffolds your beat structure with real craft prompts.

**Local-first.** All data lives in your browser via IndexedDB. No accounts, no backend, no cloud sync in v1.

## Local dev

**Prerequisites:** Node.js 20+, pnpm 10+

```bash
# Install dependencies
pnpm install

# Start dev server (webpack mode, required for PWA service worker)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Other commands

```bash
pnpm build       # Production build
pnpm start       # Serve production build
pnpm lint        # ESLint
pnpm typecheck   # TypeScript type check
```

## Stack

- **Next.js 16** (App Router, webpack mode for PWA compatibility)
- **TypeScript** strict
- **Tailwind CSS v4** + **shadcn/ui** (Slate theme)
- **Dexie.js** — IndexedDB wrapper
- **Zustand** — cross-component state
- **@serwist/next** — PWA / service worker
- **react-hook-form** + **zod** — forms and validation
- **@dnd-kit** — drag-and-drop beat reordering
- **pnpm**, **Vercel** hosting, **GitHub Actions** CI

## Deploy

Connect the repo to Vercel — it will auto-detect Next.js and deploy. The build command is `pnpm build` and output directory is `.next`.
