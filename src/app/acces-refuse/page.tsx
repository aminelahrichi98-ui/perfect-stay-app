import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function PageAccesRefuse() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="enter max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-wine-100 text-wine-700">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Cette page ne fait pas partie de vos accès</h1>
        <p className="mt-2 text-ink-2 text-pretty">
          Si vous pensez que c&apos;est une erreur, demandez à Amine ou à Abdelkarim de vous ouvrir le droit correspondant.
        </p>
        <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
