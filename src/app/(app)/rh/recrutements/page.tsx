import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Recrutements } from "./recrutements";

export const metadata = { title: "Recrutements" };

export default async function PageRecrutements() {
  const u = await exigerAcces("rh");
  const supabase = await createClient();
  const [{ data: postes }, { data: candidats }] = await Promise.all([
    supabase.from("rh_recrutements").select("id, poste, statut, notes").order("created_at", { ascending: false }),
    supabase.from("rh_candidats").select("id, recrutement_id, nom, telephone, email, etape, notes").order("created_at"),
  ]);
  return (
    <Recrutements
      modifiable={peutModifier(u, "rh")}
      postes={(postes ?? []).map((p) => ({
        id: p.id,
        poste: p.poste,
        statut: p.statut,
        notes: p.notes,
        candidats: (candidats ?? []).filter((c) => c.recrutement_id === p.id).map((c) => ({ id: c.id, nom: c.nom, telephone: c.telephone, email: c.email, etape: c.etape, notes: c.notes })),
      }))}
    />
  );
}
