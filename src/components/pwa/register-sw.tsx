"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only. Disabled in dev so HMR and
 * hot reload aren't shadowed by a cached shell.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      // A worker installed by a previous production run can keep serving an old
      // Next.js bundle on localhost, including stale Server Action identifiers.
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => {
              const scriptUrl =
                registration.active?.scriptURL ??
                registration.waiting?.scriptURL ??
                registration.installing?.scriptURL;
              return scriptUrl ? new URL(scriptUrl).pathname === "/sw.js" : false;
            })
            .map((registration) => registration.unregister()),
        ),
      );

      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("kitmotion-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }

      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal — the app still works online.
      });
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
