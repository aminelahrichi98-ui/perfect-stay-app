"use client";

import { useRouter } from "next/navigation";
import { EnvoiCaptures } from "../envoi-captures";

export function NouvelImport({ segmentId }: { segmentId?: string }) {
  const router = useRouter();
  return (
    <EnvoiCaptures
      segmentId={segmentId}
      onTermine={(importId, refusees) => {
        const p = new URLSearchParams({ extraire: "1" });
        if (refusees.length) p.set("refusees", refusees.join(" | ").slice(0, 600));
        router.push(`/estimateur/marche/import/${importId}?${p}`);
      }}
    />
  );
}
