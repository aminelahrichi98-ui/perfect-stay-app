"use client";

import { useEffect } from "react";

/** Enregistre le petit service worker (page « hors ligne » + installation sur l'écran d'accueil) en production seulement. */
export function EnregistrerSw() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
