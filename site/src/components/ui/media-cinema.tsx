"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MEDIAS } from "@/lib/medias";
import { cn } from "@/lib/cn";

/**
 * Séquence vidéo si elle est livrée (lecture muette en boucle, pause hors écran et si
 * l'utilisateur préfère moins d'animations), sinon la composition graphique de remplacement.
 */
export function MediaCinema({ scene, children, className }: { scene: string; children: ReactNode; className?: string }) {
  const media = MEDIAS[scene];
  const ref = useRef<HTMLVideoElement>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const maj = () => setMobile(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.15 });
    obs.observe(v);
    return () => obs.disconnect();
  }, [mobile]);

  const src = media && (mobile ? media.videoMobile ?? media.video : media.video);
  // Pas de vidéo livrée : la composition de remplacement garde sa propre mise en page
  if (!src) return <>{children}</>;
  return (
    <video
      ref={ref}
      key={src}
      className={cn("h-full w-full object-cover", className)}
      src={src}
      poster={media.poster ?? undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
