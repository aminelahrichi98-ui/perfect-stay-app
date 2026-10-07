import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { modifierLogement } from "../../actions";
import { proprietairesDisponibles } from "../../donnees";
import { FormulaireLogement, type ValeursLogement } from "../../formulaire-logement";
import { ZoneSuppression } from "./zone-suppression";

export const metadata = { title: "Modifier le logement" };

export default async function PageModifierLogement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avertissement?: string }>;
}) {
  const u = await exigerAcces("logements", "modifier");
  const { id } = await params;
  const { avertissement } = await searchParams;
  const supabase = await createClient();

  const [{ data: l }, { data: ical }, { data: contacts }, { data: liens }, proprietaires] = await Promise.all([
    supabase.from("logements").select("*").eq("id", id).maybeSingle(),
    supabase.from("logement_ical").select("plateforme, url").eq("logement_id", id).order("plateforme"),
    supabase.from("logement_contacts").select("role, nom, telephone").eq("logement_id", id),
    supabase.from("logement_proprietaires").select("user_id").eq("logement_id", id),
    proprietairesDisponibles(),
  ]);
  if (!l) notFound();
  const { count: nbVersements } = u.admin
    ? await supabase.from("versements").select("id", { count: "exact", head: true }).eq("logement_id", id)
    : { count: 0 };

  const valeurs: ValeursLogement = {
    nom: l.nom,
    type: l.type,
    statut: l.statut,
    capacite: l.capacite ? String(l.capacite) : "",
    ville: l.ville,
    adresse: l.adresse,
    maps_url: l.maps_url,
    frais_menage: String(Number(l.frais_menage)).replace(".", ","),
    taux_commission: String(Number(l.taux_commission)).replace(".", ","),
    code_acces: l.code_acces,
    wifi_nom: l.wifi_nom,
    wifi_mot_de_passe: l.wifi_mot_de_passe,
    equipements: l.equipements,
    notes: l.notes,
    proprietaire_nom: l.proprietaire_nom,
    proprietaire_adresse: l.proprietaire_adresse,
    proprietaire_ice: l.proprietaire_ice,
    proprietaires: (liens ?? []).map((x) => x.user_id),
    ical: ical ?? [],
    contacts: contacts ?? [],
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Link href={`/logements/${id}`} className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {l.nom}
      </Link>
      <Card className="p-5 md:p-7">
        <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight">Modifier le logement</h1>
        <FormulaireLogement
          action={modifierLogement.bind(null, id)}
          valeurs={valeurs}
          proprietaires={proprietaires}
          libelleBouton="Enregistrer les modifications"
          avertissement={avertissement}
        />
      </Card>
      {u.admin ? <ZoneSuppression id={id} nom={l.nom} nbVersements={nbVersements ?? 0} /> : null}
    </div>
  );
}
