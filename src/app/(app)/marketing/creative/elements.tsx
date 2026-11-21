import Link from "next/link";
import { Card, Notice } from "@/components/ui";

/* Éléments d'affichage utilisables partout, y compris dans les composants interactifs. */

export function Vide({ titre, children, action }: { titre: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <h2 className="font-display text-lg font-semibold tracking-tight">{titre}</h2>
      <p className="mt-1 max-w-md text-ink-2 text-pretty">{children}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function LectureSeule() {
  return <Notice ton="info">Vous pouvez consulter ce module. La modification demande le droit « Modifier » sur le Marketing.</Notice>;
}

export const lienAngle = (id: string) => `/marketing/creative/angles/${id}`;

export function LienRetour({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
      ← {children}
    </Link>
  );
}
