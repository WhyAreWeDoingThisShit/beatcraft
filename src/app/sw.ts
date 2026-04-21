import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  offlineAnalyticsConfig: false,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Allow the client to trigger an update when ready
(self as unknown as EventTarget).addEventListener("message", (event: Event) => {
  const msg = event as MessageEvent;
  if (msg.data?.type === "SKIP_WAITING") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as unknown as any).skipWaiting();
  }
});
