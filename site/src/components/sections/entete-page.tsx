import { Surtitre } from "@/components/ui/surtitre";

/** En-tête des pages intérieures */
export function EntetePage({ surtitre, titre, texte }: { surtitre: string; titre: string; texte?: string }) {
  return (
    <header className="bg-charbon pt-36 pb-14 md:pt-44 md:pb-20">
      <div className="mx-auto max-w-[88rem] px-5 [animation:entree-bas_1s_var(--ease-cine)_both] md:px-10">
        <Surtitre>{surtitre}</Surtitre>
        <h1 className="titre mt-5 max-w-4xl text-[2.6rem] leading-[1.04] text-papier md:text-[4.2rem]">{titre}</h1>
        {texte ? <p className="mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-papier/70">{texte}</p> : null}
      </div>
    </header>
  );
}
