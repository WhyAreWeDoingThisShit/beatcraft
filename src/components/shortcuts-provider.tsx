"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsCtx {
  showHelp: () => void;
}

const Ctx = createContext<ShortcutsCtx>({ showHelp: () => {} });

export function useShortcuts() {
  return useContext(Ctx);
}

const ROWS = [
  { keys: ["g", "p"], label: "Go to projects" },
  { keys: ["g", "b"], label: "Go to board" },
  { keys: ["g", "w"], label: "Go to wiki" },
  { keys: ["g", "r"], label: "Go to progress" },
  { keys: ["g", "s"], label: "Go to settings" },
  { keys: ["n"], label: "New beat / new entity" },
  { keys: ["/"], label: "Focus search" },
  { keys: ["?"], label: "Show this help" },
];

function Kbd({ k }: { k: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[11px] text-muted-foreground">
      {k}
    </kbd>
  );
}

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.keys.join("")} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <span className="flex items-center gap-1">
                    {row.keys.map((k) => (
                      <Kbd key={k} k={k} />
                    ))}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">{row.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHelp = useCallback(() => setHelpOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = target.matches("input, textarea, select, [contenteditable]");
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const projectId = (params as { id?: string })?.id;

      if (key === "?" || (key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (key === "Escape") {
        setHelpOpen(false);
        pendingKey.current = null;
        clearTimeout(pendingTimer.current);
        return;
      }

      if (pendingKey.current === "g") {
        clearTimeout(pendingTimer.current);
        pendingKey.current = null;
        switch (key) {
          case "p":
            e.preventDefault();
            router.push("/");
            break;
          case "b":
            if (projectId) { e.preventDefault(); router.push(`/projects/${projectId}`); }
            break;
          case "w":
            if (projectId) { e.preventDefault(); router.push(`/projects/${projectId}/wiki`); }
            break;
          case "r":
            if (projectId) { e.preventDefault(); router.push(`/projects/${projectId}/progress`); }
            break;
          case "s":
            if (projectId) { e.preventDefault(); router.push(`/projects/${projectId}/settings`); }
            break;
        }
        return;
      }

      if (key === "g") {
        pendingKey.current = "g";
        pendingTimer.current = setTimeout(() => { pendingKey.current = null; }, 800);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(pendingTimer.current);
    };
  }, [router, params]);

  return (
    <Ctx.Provider value={{ showHelp }}>
      {children}
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Ctx.Provider>
  );
}
