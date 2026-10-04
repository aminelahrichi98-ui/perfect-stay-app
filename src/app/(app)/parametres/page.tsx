import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { Badge, buttonClass, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TYPES_UTILISATEUR } from "@/lib/modules";

export const metadata = { title: "Utilisateurs" };

async function derniereConnexion(): Promise<Map<string, string | null>> {
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
    return new Map((data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  } catch {
    return new Map();
  }
}

export default async function PageUtilisateurs({ searchParams }: { searchParams: Promise<{ cree?: string }> }) {
  const moi = await exigerAcces("parametres");
  const { cree } = await searchParams;
  const supabase = await createClient();
  const [{ data: profils }, connexions] = await Promise.all([
    supabase.from("profiles").select("id, prenom, nom, email, type, poles, is_admin, actif").order("prenom"),
    derniereConnexion(),
  ]);
  const peutCreer = peutModifier(moi, "parametres");

  return (
    <div className="space-y-5">
      {cree ? (
        <Notice ton="ok">
          Compte créé : {cree} va recevoir un e-mail pour choisir son mot de passe. Pensez à lui dire de regarder aussi dans ses courriers indésirables.
        </Notice>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {profils?.length ?? 0} compte{(profils?.length ?? 0) > 1 ? "s" : ""}
        </p>
        {peutCreer ? (
          <Link href="/parametres/utilisateurs/nouveau" className={buttonClass("primary", "md")}>
            <UserPlus className="h-4 w-4" /> Nouvel utilisateur
          </Link>
        ) : null}
      </div>

      {profils?.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {profils.map((p) => {
              const type = TYPES_UTILISATEUR.find((t) => t.value === p.type)?.label;
              const jamaisConnecte = connexions.size > 0 && !connexions.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/parametres/utilisateurs/${p.id}`}
                    className="press flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-sunken/60"
                  >
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wine-100 text-sm font-semibold text-wine-800">
                      {(p.prenom[0] ?? "") + (p.nom[0] ?? "")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                          {p.prenom} {p.nom}
                          {p.id === moi.id ? <span className="font-normal text-ink-3"> (vous)</span> : null}
                        </span>
                        {p.is_admin ? <Badge ton="marque">Administrateur</Badge> : <Badge>{type}</Badge>}
                        {!p.actif ? <Badge ton="danger">Désactivé</Badge> : jamaisConnecte ? <Badge ton="attention">Invitation envoyée</Badge> : null}
                      </span>
                      <span className="block truncate text-sm text-ink-2">
                        {p.email}
                        {p.poles?.length ? ` · ${p.poles.join(", ")}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="px-6 py-12 text-center">
          <p className="font-medium">Aucun compte pour le moment</p>
          <p className="mt-1 text-ink-2">Créez le premier utilisateur pour inviter votre équipe.</p>
        </Card>
      )}
    </div>
  );
}
