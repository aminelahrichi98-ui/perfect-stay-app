import { Field, Select } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { STATUTS_CREATIVE, TYPES_IMAGE } from "@/lib/creative";
import { charger, ScriptAFaire } from "../commun";
import { LectureSeule, Vide } from "../elements";
import { chargerAngles, chargerCreatives } from "../donnees";
import { Filtres } from "../filtres";
import { Galerie } from "../galerie";

export default async function PageCreatives({ searchParams }: { searchParams: Promise<{ angle?: string; type?: string; statut?: string }> }) {
  const u = await exigerAcces("marketing");
  const sp = await searchParams;
  const donnees = await charger(async () => ({ angles: await chargerAngles(), creatives: await chargerCreatives() }));
  if (!donnees) return <ScriptAFaire />;
  const modifiable = peutModifier(u, "marketing");
  const statut = sp.statut ?? "actives";
  const visibles = donnees.creatives.filter((c) => (!sp.angle || c.angleId === sp.angle) && (!sp.type || c.type === sp.type) && (statut === "toutes" || (statut === "actives" ? c.statut !== "archivee" : c.statut === statut)));

  return (
    <div className="space-y-5">
      {modifiable ? null : <LectureSeule />}
      <Filtres className="grid gap-3 sm:grid-cols-3">
        <Field label="Angle" htmlFor="f-angle">
          <Select id="f-angle" name="angle" defaultValue={sp.angle ?? ""}>
            <option value="">Tous les angles</option>
            {donnees.angles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type d'image" htmlFor="f-type">
          <Select id="f-type" name="type" defaultValue={sp.type ?? ""}>
            <option value="">Tous les types</option>
            {TYPES_IMAGE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut" htmlFor="f-statut">
          <Select id="f-statut" name="statut" defaultValue={statut}>
            <option value="actives">Non archivées</option>
            <option value="toutes">Toutes</option>
            {STATUTS_CREATIVE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </Filtres>
      <Galerie
        creatives={visibles}
        angles={donnees.angles.filter((a) => a.statut !== "archived").map((a) => ({ id: a.id, code: a.code, nom: a.nom }))}
        modifiable={modifiable}
        vide={<Vide titre={donnees.creatives.length ? "Aucune image ne correspond à ces filtres" : "Aucune image pour l'instant"}>Ajoutez les images créées avec Claude et Higgsfield : chaque image garde son prompt, son hook et, une fois publiée, son identifiant Meta.</Vide>}
      />
    </div>
  );
}
