import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Confidentialité" };

/* Texte de base à faire valider (loi marocaine 09-08 sur la protection des données personnelles, CNDP). */
export default function Confidentialite() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 md:py-24">
      <Link href="/" className="inline-block">
        <Logo />
      </Link>
      <h1 className="titre mt-12 text-[2.8rem]">Confidentialité</h1>
      <p className="mt-3 text-[0.8rem] tracking-wide text-or uppercase">Texte provisoire, à valider avant publication</p>
      <div className="mt-8 space-y-5 text-[1rem] leading-relaxed text-papier/75">
        <p>Les informations saisies dans le formulaire d&apos;estimation (coordonnées et caractéristiques de votre bien) servent uniquement à vous recontacter et à étudier le potentiel locatif de votre bien.</p>
        <p>Elles ne sont ni revendues ni cédées à des tiers à des fins commerciales. Vous pouvez demander leur consultation, leur rectification ou leur suppression à tout moment en nous contactant.</p>
        <p>La mesure d&apos;audience n&apos;est activée qu&apos;avec votre accord, donné via le bandeau de consentement. Vous pouvez changer d&apos;avis en effaçant les données du site dans votre navigateur.</p>
      </div>
    </main>
  );
}
