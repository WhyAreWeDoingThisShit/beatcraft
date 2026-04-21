"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function useSWUpdate() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let toastShown = false;

    function showUpdateToast(waiting: ServiceWorker) {
      if (toastShown) return;
      toastShown = true;
      toast("Update available", {
        description: "A new version is ready.",
        action: {
          label: "Refresh",
          onClick: () => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true },
            );
          },
        },
        duration: Infinity,
      });
    }

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(installing);
          }
        });
      });
    });
  }, []);
}
