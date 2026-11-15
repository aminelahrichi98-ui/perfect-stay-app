/*
  Composition de remplacement du plan d'ouverture (en attendant la séquence Higgsfield) :
  un intérieur contemporain dessiné au trait, baigné par une lumière de fenêtre qui glisse.
  Entièrement vectorielle : légère, nette sur tous les écrans, sans requête réseau.
*/
export function HeroVisuel() {
  const or = "#b69a70";
  return (
    <div aria-hidden className="grain absolute inset-0 overflow-hidden bg-charbon">
      {/* Lumière chaude venue de la fenêtre */}
      <div className="absolute -top-1/4 right-[-10%] h-[120%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgb(217_205_189/0.22),transparent)] blur-2xl" />
      <div className="absolute inset-y-0 right-[8%] w-[38%] [animation:lumiere_14s_ease-in-out_infinite_alternate] bg-[linear-gradient(100deg,transparent_10%,rgb(245_242_236/0.10)_40%,transparent_60%,rgb(245_242_236/0.07)_75%,transparent_85%)]" />

      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full [animation:entree-bas_1.6s_var(--ease-cine)_both]">
        <defs>
          <linearGradient id="vitre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f2ec" stopOpacity="0.55" />
            <stop offset="1" stopColor="#d9cdbd" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="faisceau" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5f2ec" stopOpacity="0.16" />
            <stop offset="1" stopColor="#f5f2ec" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c1f22" stopOpacity="0" />
            <stop offset="1" stopColor="#26292d" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Sol */}
        <path d="M0 760 L1600 690 L1600 1000 L0 1000Z" fill="url(#sol)" />
        {/* Fenêtre toute hauteur */}
        <g>
          <rect x="1080" y="150" width="330" height="560" fill="url(#vitre)" />
          <path d="M1190 150V710M1300 150V710M1080 400H1410" stroke="#111315" strokeWidth="6" opacity="0.6" />
          <rect x="1080" y="150" width="330" height="560" fill="none" stroke={or} strokeOpacity="0.5" strokeWidth="1.2" />
        </g>
        {/* Faisceaux de lumière sur le sol */}
        <path d="M1080 710 L1410 700 L1180 1000 L560 1000Z" fill="url(#faisceau)" />

        {/* Lignes d'architecture (tracées à l'arrivée) */}
        <g fill="none" stroke={or} strokeWidth="1.1" strokeOpacity="0.55">
          <path className="tracer" style={{ ["--longueur" as string]: 1700 }} d="M0 120 L1600 60" />
          <path className="tracer" style={{ ["--longueur" as string]: 1700, ["--delai" as string]: "200ms" }} d="M0 760 L1600 690" />
          <path className="tracer" style={{ ["--longueur" as string]: 700, ["--delai" as string]: "400ms" }} d="M700 92 V739" strokeOpacity="0.3" />
          <path className="tracer" style={{ ["--longueur" as string]: 700, ["--delai" as string]: "500ms" }} d="M1500 66 V693" />
          {/* Suspension */}
          <path className="tracer" style={{ ["--longueur" as string]: 260, ["--delai" as string]: "800ms" }} d="M960 70 V280" />
          <path className="tracer" style={{ ["--longueur" as string]: 260, ["--delai" as string]: "1000ms" }} d="M915 280 Q960 245 1005 280 Z" />
        </g>
        {/* Halo de la suspension */}
        <ellipse cx="960" cy="300" rx="90" ry="22" fill="#cdb58f" opacity="0.14" />

        {/* Mobilier en silhouette */}
        <g fill="#1c1f22" stroke={or} strokeOpacity="0.35" strokeWidth="1" transform="translate(330 0)">
          <path d="M360 640 h520 a24 24 0 0 1 24 24 v70 h-568 v-70 a24 24 0 0 1 24 -24Z" />
          <path d="M380 590 h480 a20 20 0 0 1 20 20 v40 h-520 v-40 a20 20 0 0 1 20 -20Z" fill="#26292d" />
          <rect x="700" y="760" width="250" height="18" rx="9" />
          <path d="M720 778 v40 M930 778 v40" />
          <ellipse cx="830" cy="852" rx="330" ry="34" fill="#26292d" stroke="none" opacity="0.7" />
        </g>
        {/* Plante */}
        <g transform="translate(480 -20)">
          <rect x="980" y="640" width="70" height="80" rx="8" fill="#26292d" stroke={or} strokeOpacity="0.35" />
          <g fill="#3a3f37" opacity="0.9">
            <ellipse cx="1000" cy="600" rx="40" ry="70" transform="rotate(-25 1000 600)" />
            <ellipse cx="1040" cy="580" rx="36" ry="80" transform="rotate(18 1040 580)" />
            <ellipse cx="1015" cy="560" rx="28" ry="70" />
          </g>
        </g>
      </svg>

      {/* Vignettage cinéma et fondu vers le contenu */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_40%,transparent_40%,rgb(17_19_21/0.85))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-charbon via-charbon/70 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-charbon/90 via-charbon/40 to-transparent" />
    </div>
  );
}
