import Link from "next/link";
import { FileUp, Plus, Users } from "lucide-react";
import { buttonClass, Card, Notice, PageHeader } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { lireResponsables } from "../operations/donnees";
import { lireIndicateurs, lireLeads } from "./donnees";
import { FiltresCrm } from "./filtres-crm";
import { KanbanCrm } from "./kanban-crm";

export const metadata = { title: "CRM" };

export default async function PageCrm({ searchParams }: { searchParams: Promise<{ responsable?: string; source?: string; supprime?: string }> }) {
  const u = await exigerAcces("crm");
  const sp = await searchParams;
  const modifiable = peutModifier(u, "crm");
  const equipe = (await lireResponsables()).filter((r) => !r.prestataire);
  const filtres = {
    responsable: sp.responsable === "moi" || sp.responsable === "aucun" || equipe.some((r) => r.id === sp.responsable) ? (sp.responsable as string) : "",
    source: sp.source ?? "",
  };
  const [ind, leads] = await Promise.all([lireIndicateurs(), lireLeads(filtres, u.id)]);
  const nomResp = new Map(equipe.map((r) => [r.id, r.nom]));

  const cartes = [
    { titre: "Leads reçus", valeur: String(ind.recusMois), note: `ce mois · ${ind.recusSemaine} cette semaine` },
    { titre: "Leads appelés", valeur: String(ind.appelesSemaine), note: "cette semaine" },
    { titre: "Rendez-vous", valeur: String(ind.rdvMois), note: "ce mois" },
    { titre: "Signatures", valeur: String(ind.signesMois), note: "ce mois" },
    { titre: "Conversion", valeur: ind.conversion === null ? "—" : `${String(ind.conversion).replace(".", ",")} %`, note: "signatures ÷ leads reçus du mois" },
  ];

  return (
    <>
      <PageHeader
        titre="CRM"
        description="Les prospects propriétaires, de la première demande à la signature."
        action={
          modifiable ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/crm/importer" className={buttonClass("secondary", "md")}>
                <FileUp className="h-4 w-4" /> Importer
              </Link>
              <Link href="/crm/nouveau" className={buttonClass("primary", "md")}>
                <Plus className="h-4 w-4" /> Nouveau lead
              </Link>
            </div>
          ) : undefined
        }
      />
      {sp.supprime ? (
        <div className="mb-4">
          <Notice ton="ok">Lead supprimé.</Notice>
        </div>
      ) : null}

      <ul className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cartes.map((c, i) => (
          <li key={c.titre} className="enter" style={{ "--i": i } as React.CSSProperties}>
            <Card className="h-full p-4">
              <p className="text-sm text-ink-2">{c.titre}</p>
              <p className="num mt-1 font-display text-3xl leading-none font-semibold tracking-tight">{c.valeur}</p>
              <p className="mt-1.5 text-[0.78rem] text-ink-3 text-pretty">{c.note}</p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mb-4">
        <FiltresCrm responsable={filtres.responsable} source={filtres.source} responsables={equipe.map((r) => ({ id: r.id, nom: r.nom }))} />
      </div>

      {leads.length || filtres.responsable || filtres.source ? (
        <KanbanCrm leads={leads.map((l) => ({ ...l, responsableNom: l.responsable_id ? (nomResp.get(l.responsable_id) ?? null) : null }))} peutModifier={modifiable} />
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun lead pour le moment</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Ajoutez un prospect à la main, importez un fichier CSV (par exemple depuis Kommo), ou branchez vos formulaires Meta pour les recevoir automatiquement.</p>
        </Card>
      )}
    </>
  );
}
