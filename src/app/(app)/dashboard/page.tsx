import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, modulesVisibles } from "@/lib/auth";
import { formatJourLong, momentDeLaJournee } from "@/lib/format";
import { MODULE_BY_KEY } from "@/lib/modules";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const u = await exigerAcces("dashboard");
  const moment = momentDeLaJournee();
  const salut = moment === "soir" ? "Bonsoir" : "Bonjour";
  const modules = modulesVisibles(u).filter((k) => k !== "dashboard" && !MODULE_BY_KEY[k].masque);

  return (
    <>
      <header className="enter mb-8">
        <p className="text-sm font-medium text-ink-3 capitalize">{formatJourLong()}</p>
        <h1 className="mt-1 font-display text-[1.9rem] leading-tight font-semibold tracking-tight md:text-4xl">
          {salut} {u.prenom}
        </h1>
        <p className="mt-1 max-w-prose text-ink-2 text-pretty">
          Les chiffres du jour (réservations, commissions, leads) s&apos;afficheront ici au fil de la construction. Voici vos accès.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((k, i) => {
          const m = MODULE_BY_KEY[k];
          const Icone = m.icon;
          return (
            <li key={k} className="enter" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
              <Link href={m.href} className="press group block h-full">
                <Card className="flex h-full items-start gap-4 p-4 transition-[border-color,box-shadow] duration-150 group-hover:border-line-strong group-hover:shadow-pop">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-wine-50 text-wine-600">
                    <Icone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{m.label}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-2 text-pretty">{m.description}</span>
                    {m.phase > 1 ? (
                      <Badge className="mt-2.5" ton="neutre">
                        Phase {m.phase}
                      </Badge>
                    ) : (
                      <Badge className="mt-2.5" ton="ok">
                        Disponible
                      </Badge>
                    )}
                  </span>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
