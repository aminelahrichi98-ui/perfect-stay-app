import { Hammer } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";

/** Page d'un module pas encore construit : indique clairement la suite du programme. */
export function ComingSoon({ module }: { module: ModuleKey }) {
  const m = MODULE_BY_KEY[module];
  const Icone = m.icon;
  return (
    <>
      <PageHeader titre={m.label} description={m.description} />
      <Card className="enter flex flex-col items-center px-6 py-14 text-center" style={{ "--i": 1 } as React.CSSProperties}>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
          <Icone className="h-7 w-7" />
        </span>
        <Badge ton="marque" className="mt-5">
          <Hammer className="h-3 w-3" /> Prévu en phase {m.phase}
        </Badge>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Ce module arrive bientôt</h2>
        <p className="mt-1.5 max-w-sm text-ink-2 text-pretty">
          Votre accès à « {m.label} » est déjà en place. Le contenu sera construit à la phase {m.phase} du projet.
        </p>
      </Card>
    </>
  );
}
