import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isModuleKey, type Droits } from "@/lib/modules";
import { modifierUtilisateur } from "../../actions";
import { BoutonRenvoyer, BoutonStatut, LienAcces } from "../../actions-compte";
import { FormulaireUtilisateur } from "../../formulaire-utilisateur";

export const metadata = { title: "Utilisateur" };

export default async function PageUtilisateur({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const moi = await exigerAcces("parametres", "modifier");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: profil }, { data: lignes }, { data: logements }, { data: liens }] = await Promise.all([
    supabase.from("profiles").select("id, prenom, nom, email, type, poles, is_admin, actif").eq("id", id).maybeSingle(),
    supabase.from("permissions").select("module, can_view, can_edit").eq("user_id", id),
    supabase.from("logements").select("id, nom").order("nom"),
    supabase.from("logement_proprietaires").select("logement_id").eq("user_id", id),
  ]);
  if (!profil) notFound();

  const droits: Droits = {};
  for (const l of lignes ?? []) if (isModuleKey(l.module)) droits[l.module] = { voir: l.can_view, modifier: l.can_edit };

  const soi = profil.id === moi.id;
  const verrouille = profil.is_admin && !moi.admin;

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/parametres" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Utilisateurs
      </Link>

      <Card className="p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {profil.prenom} {profil.nom}
          </h2>
          {profil.is_admin ? <Badge ton="marque">Administrateur</Badge> : null}
          {!profil.actif ? <Badge ton="danger">Désactivé</Badge> : null}
        </div>

        {soi ? (
          <Notice ton="info">C&apos;est votre propre compte : vous ne pouvez pas modifier vos droits ni vous désactiver vous-même.</Notice>
        ) : verrouille ? (
          <Notice ton="info">Seul un administrateur peut modifier le compte d&apos;un autre administrateur.</Notice>
        ) : (
          <FormulaireUtilisateur
            action={modifierUtilisateur.bind(null, id)}
            accordant={{ admin: moi.admin, droits: moi.droits }}
            edition
            libelleBouton="Enregistrer les modifications"
            logements={logements ?? []}
            logementsRattaches={(liens ?? []).map((l) => l.logement_id)}
            peutRattacher={peutModifier(moi, "logements")}
            valeurs={{
              prenom: profil.prenom,
              nom: profil.nom,
              email: profil.email,
              type: profil.type,
              poles: profil.poles ?? [],
              admin: profil.is_admin,
              droits,
            }}
          />
        )}
      </Card>

      {sp.cree ? <Notice ton="ok">Compte créé. Donnez maintenant son accès à {profil.prenom} avec le lien ci-dessous.</Notice> : null}

      {!soi && !verrouille ? (
        <Card className="space-y-3 p-5 md:p-7">
          <div>
            <h3 className="font-medium">Donner l&apos;accès à {profil.prenom}</h3>
            <p className="mt-0.5 text-sm text-ink-2 text-pretty">Générez un lien personnel et envoyez-le par WhatsApp, SMS ou e-mail. {profil.prenom} l&apos;ouvre, choisit son mot de passe et arrive dans l&apos;application.</p>
          </div>
          <LienAcces id={id} prenom={profil.prenom} />
        </Card>
      ) : null}

      {!soi && !verrouille ? (
        <Card className="space-y-4 p-5 md:p-7">
          <div>
            <h3 className="font-medium">Accès au compte</h3>
            <p className="mt-0.5 text-sm text-ink-2 text-pretty">
              Désactiver un compte l&apos;empêche de se connecter, sans rien supprimer : son historique reste intact et vous pouvez le réactiver à tout moment.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <BoutonStatut id={id} actif={profil.actif} />
            <BoutonRenvoyer id={id} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
