import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { ImportCsv } from "./import-csv";

export const metadata = { title: "Importer des leads" };

export default async function PageImportLeads() {
  await exigerAcces("crm", "modifier");
  return (
    <div className="max-w-3xl">
      <Link href="/crm" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> CRM
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Importer des leads</h2>
        <p className="mt-1 mb-6 text-ink-2 text-pretty">Choisissez un fichier CSV (par exemple exporté de Kommo ou d&apos;Excel). Les leads déjà présents (même téléphone ou même e-mail) ne sont jamais importés deux fois.</p>
        <ImportCsv />
      </Card>
    </div>
  );
}
