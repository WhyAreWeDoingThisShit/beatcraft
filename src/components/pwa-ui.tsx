"use client";

import { useOffline } from "@/hooks/use-offline";
import { useSWUpdate } from "@/hooks/use-sw-update";

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      You're offline — changes are saved locally and will sync when you reconnect.
    </div>
  );
}

export function PWAUpdateWatcher() {
  useSWUpdate();
  return null;
}
