"use client";

/*
  Appartement procédural en coupe (vue isométrique) : géométrie Three.js simple, assemblée à la main.
  Volontairement léger (aucun fichier 3D à télécharger) : environ 150 maillages, matériaux mats,
  lumière de fin d'après-midi entrant par les fenêtres du séjour.
  Repère : 1 unité ≈ 1 mètre, sol à y = 0, appartement de 12 × 8 m centré sur l'origine.
*/
import { useMemo } from "react";
import * as THREE from "three";

const H = 2.6; // hauteur sous plafond
const E = 0.14; // épaisseur des murs
const COUPE = 0.32; // hauteur des murs coupés (avant et droite)

const C = {
  mur: "#ece7de",
  sol: "#b9a184",
  solBain: "#d9d4cc",
  coupe: "#7a3e6c",
  tissu: "#d9cdbd",
  tissuFonce: "#230c1f",
  bois: "#7a6248",
  boisClair: "#c4ab8a",
  noir: "#1c1f22",
  graphite: "#34383d",
  pierre: "#f1ede6",
  plante: "#55604f",
  linge: "#f7f4ef",
};

type Vec3 = [number, number, number];

function Boite({ p, s, c, r = 0.85, ombre = true, emissif }: { p: Vec3; s: Vec3; c: string; r?: number; ombre?: boolean; emissif?: { couleur: string; intensite: number } }) {
  return (
    <mesh position={p} castShadow={ombre} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={0} emissive={emissif?.couleur ?? "#000000"} emissiveIntensity={emissif?.intensite ?? 0} />
    </mesh>
  );
}

function Cylindre({ p, r, h, c, rough = 0.7, emissif }: { p: Vec3; r: number; h: number; c: string; rough?: number; emissif?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 28]} />
      <meshStandardMaterial color={c} roughness={rough} emissive={emissif ? c : "#000000"} emissiveIntensity={emissif ?? 0} />
    </mesh>
  );
}

/** Mur avec ouvertures (portes, fenêtres) découpées le long de son axe. */
function Mur({ de, a, hauteur = H, ouvertures = [], couleur = C.mur }: { de: [number, number]; a: [number, number]; hauteur?: number; ouvertures?: { debut: number; fin: number; bas?: number; haut?: number }[]; couleur?: string }) {
  const dx = a[0] - de[0];
  const dz = a[1] - de[1];
  const longueur = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  // Pleins entre les ouvertures, plus allèges et linteaux des fenêtres
  const morceaux: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const triees = [...ouvertures].sort((o1, o2) => o1.debut - o2.debut);
  let curseur = 0;
  for (const o of triees) {
    if (o.debut > curseur) morceaux.push({ x0: curseur, x1: o.debut, y0: 0, y1: hauteur });
    if ((o.bas ?? 0) > 0) morceaux.push({ x0: o.debut, x1: o.fin, y0: 0, y1: o.bas! });
    if ((o.haut ?? hauteur) < hauteur) morceaux.push({ x0: o.debut, x1: o.fin, y0: o.haut!, y1: hauteur });
    curseur = o.fin;
  }
  if (curseur < longueur) morceaux.push({ x0: curseur, x1: longueur, y0: 0, y1: hauteur });

  return (
    <group position={[de[0], 0, de[1]]} rotation={[0, -angle, 0]}>
      {morceaux.map((m, i) => (
        <mesh key={i} position={[(m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[m.x1 - m.x0, m.y1 - m.y0, E]} />
          <meshStandardMaterial color={couleur} roughness={0.95} />
        </mesh>
      ))}
      {/* Tranche dorée du mur coupé : signature visuelle de la maquette */}
      {hauteur < H ? (
        <mesh position={[longueur / 2, hauteur + 0.006, 0]}>
          <boxGeometry args={[longueur, 0.012, E + 0.004]} />
          <meshStandardMaterial color={C.coupe} roughness={0.4} metalness={0.3} />
        </mesh>
      ) : null}
    </group>
  );
}

function Vitre({ p, s, rotationY = 0 }: { p: Vec3; s: [number, number]; rotationY?: number }) {
  return (
    <mesh position={p} rotation={[0, rotationY, 0]}>
      <planeGeometry args={s} />
      <meshStandardMaterial color="#f5efe3" emissive="#f3e3c6" emissiveIntensity={1.15} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Chaise({ p, rot = 0 }: { p: Vec3; rot?: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <Boite p={[0, 0.45, 0]} s={[0.42, 0.06, 0.42]} c={C.boisClair} />
      <Boite p={[0, 0.72, -0.19]} s={[0.42, 0.5, 0.05]} c={C.boisClair} />
      {[-0.17, 0.17].flatMap((x) => [-0.17, 0.17].map((z) => <Boite key={`${x}${z}`} p={[x, 0.22, z]} s={[0.04, 0.44, 0.04]} c={C.bois} />))}
    </group>
  );
}

function Plante({ p, echelle = 1 }: { p: Vec3; echelle?: number }) {
  return (
    <group position={p} scale={echelle}>
      <Cylindre p={[0, 0.25, 0]} r={0.22} h={0.5} c={C.graphite} />
      {[
        [0, 0.85, 0, 0.32],
        [0.14, 1.1, 0.06, 0.24],
        [-0.12, 1.05, -0.08, 0.26],
        [0.04, 1.32, -0.02, 0.2],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={C.plante} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Appartement() {
  const solBois = useMemo(() => new THREE.Color(C.sol), []);
  return (
    <group>
      {/* Socle et sols */}
      <Boite p={[0, -0.16, 0]} s={[12.6, 0.3, 8.6]} c={C.noir} r={0.6} ombre={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0.001, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color={solBois} roughness={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.75, 0.002, 2.25]} receiveShadow>
        <planeGeometry args={[2.5, 3.5]} />
        <meshStandardMaterial color={C.solBain} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0.001, -1.75]} receiveShadow>
        <planeGeometry args={[2, 4.5]} />
        <meshStandardMaterial color={solBois} roughness={0.75} />
      </mesh>

      {/* Murs pleins (fond et gauche) avec fenêtres */}
      <Mur de={[-6, -4]} a={[6, -4]} ouvertures={[{ debut: 9.9, fin: 11.4, bas: 0.9, haut: 2.2 }]} />
      <Mur
        de={[-6, 4]}
        a={[-6, -4]}
        ouvertures={[
          { debut: 0.7, fin: 2.3, bas: 0.25, haut: 2.35 },
          { debut: 3.6, fin: 5.3, bas: 0.25, haut: 2.35 },
        ]}
      />
      <Vitre p={[-6.02, 1.3, 2.5]} s={[1.6, 2.1]} rotationY={Math.PI / 2} />
      <Vitre p={[-6.02, 1.3, -0.45]} s={[1.7, 2.1]} rotationY={Math.PI / 2} />
      <Vitre p={[4.65, 1.55, -4.02]} s={[1.5, 1.3]} />

      {/* Cloisons intérieures */}
      <Mur de={[1, -4]} a={[1, 0.5]} />
      <Mur de={[1, 0.5]} a={[6, 0.5]} ouvertures={[{ debut: 0.35, fin: 1.3 }]} />
      <Mur de={[3.5, 0.5]} a={[3.5, 4]} ouvertures={[{ debut: 1.1, fin: 2.0 }]} />

      {/* Murs coupés (avant et droite) */}
      <Mur de={[-6, 4]} a={[6, 4]} hauteur={COUPE} ouvertures={[{ debut: 7.4, fin: 8.4 }]} />
      <Mur de={[6, 4]} a={[6, -4]} hauteur={COUPE} />

      {/* Cuisine : plan de travail le long du mur du fond, îlot */}
      <Boite p={[-4.2, 0.45, -3.62]} s={[3.2, 0.9, 0.62]} c={C.pierre} r={0.5} />
      <Boite p={[-4.2, 0.92, -3.62]} s={[3.24, 0.04, 0.66]} c={C.graphite} r={0.4} />
      <Boite p={[-4.2, 2.0, -3.74]} s={[3.2, 0.7, 0.38]} c={C.pierre} r={0.5} />
      <Boite p={[-4.2, 0.46, -2.2]} s={[1.9, 0.92, 0.75]} c={C.bois} r={0.7} />
      <Boite p={[-4.2, 0.94, -2.2]} s={[2.0, 0.05, 0.85]} c={C.pierre} r={0.35} />
      {[-4.8, -4.2, -3.6].map((x) => (
        <group key={x}>
          <Cylindre p={[x, 1.9, -2.2]} r={0.11} h={0.16} c={C.linge} emissif={0.8} />
          <Boite p={[x, 2.3, -2.2]} s={[0.01, 0.65, 0.01]} c={C.noir} ombre={false} />
        </group>
      ))}

      {/* Salle à manger */}
      <Cylindre p={[-1.2, 0.74, -2.3]} r={0.62} h={0.04} c={C.boisClair} />
      <Cylindre p={[-1.2, 0.37, -2.3]} r={0.07} h={0.72} c={C.bois} />
      <Chaise p={[-1.2, 0, -1.55]} rot={Math.PI} />
      <Chaise p={[-1.2, 0, -3.05]} />
      <Chaise p={[-0.45, 0, -2.3]} rot={-Math.PI / 2} />
      <Chaise p={[-1.95, 0, -2.3]} rot={Math.PI / 2} />

      {/* Salon : tapis, canapé, table basse, meuble TV */}
      <Boite p={[-2.6, 0.012, 1.9]} s={[3.4, 0.02, 2.5]} c="#cfc3b1" r={1} ombre={false} />
      <group position={[-2.6, 0, 3.2]}>
        <Boite p={[0, 0.24, 0]} s={[2.7, 0.42, 0.95]} c={C.tissu} r={1} />
        <Boite p={[0, 0.62, 0.36]} s={[2.7, 0.5, 0.24]} c={C.tissu} r={1} />
        <Boite p={[-1.27, 0.48, 0]} s={[0.18, 0.36, 0.95]} c={C.tissu} r={1} />
        <Boite p={[1.27, 0.48, 0]} s={[0.18, 0.36, 0.95]} c={C.tissu} r={1} />
        <Boite p={[-0.6, 0.58, 0.1]} s={[0.45, 0.32, 0.14]} c={C.tissuFonce} r={1} />
        <Boite p={[0.65, 0.58, 0.1]} s={[0.45, 0.32, 0.14]} c={C.coupe} r={1} />
      </group>
      <Boite p={[-2.6, 0.32, 1.75]} s={[1.2, 0.06, 0.6]} c={C.bois} r={0.6} />
      <Boite p={[-2.6, 0.16, 1.75]} s={[1.05, 0.3, 0.45]} c={C.noir} r={0.6} />
      <Boite p={[-2.6, 0.24, 0.45]} s={[2.2, 0.48, 0.42]} c={C.bois} r={0.7} />
      <Boite p={[-2.6, 1.0, 0.5]} s={[1.5, 0.85, 0.05]} c={C.noir} r={0.3} />
      <Plante p={[-5.45, 0, 3.45]} echelle={1.15} />
      {/* Lampadaire */}
      <Cylindre p={[-0.7, 0.75, 3.5]} r={0.02} h={1.5} c={C.noir} />
      <Cylindre p={[-0.7, 1.55, 3.5]} r={0.2} h={0.26} c={C.linge} emissif={0.9} />

      {/* Chambre */}
      <group position={[3.6, 0, -2.75]}>
        <Boite p={[0, 0.22, 0]} s={[1.85, 0.44, 2.15]} c={C.bois} r={0.7} />
        <Boite p={[0, 0.52, 0.08]} s={[1.8, 0.18, 2.0]} c={C.linge} r={1} />
        <Boite p={[0, 0.62, 0.55]} s={[1.84, 0.06, 1.1]} c={C.tissu} r={1} />
        <Boite p={[-0.45, 0.68, -0.72]} s={[0.7, 0.14, 0.4]} c={C.linge} r={1} />
        <Boite p={[0.45, 0.68, -0.72]} s={[0.7, 0.14, 0.4]} c={C.linge} r={1} />
        <Boite p={[0, 0.85, -1.1]} s={[2.0, 0.9, 0.1]} c={C.tissuFonce} r={1} />
      </group>
      {[2.25, 4.95].map((x) => (
        <group key={x}>
          <Boite p={[x, 0.25, -3.6]} s={[0.5, 0.5, 0.42]} c={C.bois} r={0.6} />
          <Cylindre p={[x, 0.62, -3.6]} r={0.11} h={0.22} c={C.linge} emissif={0.9} />
        </group>
      ))}
      <Boite p={[5.62, 1.05, -1.2]} s={[0.6, 2.1, 1.6]} c={C.pierre} r={0.6} />
      <Plante p={[1.5, 0, 0.05]} echelle={0.8} />

      {/* Entrée */}
      <Boite p={[1.35, 0.4, 2.6]} s={[0.4, 0.8, 1.3]} c={C.bois} r={0.6} />
      <Boite p={[1.9, 0.01, 3.55]} s={[1.0, 0.02, 0.6]} c={C.graphite} r={1} ombre={false} />

      {/* Salle de bain */}
      <mesh position={[5.25, 1.05, 1.3]}>
        <boxGeometry args={[1.35, 2.1, 1.35]} />
        <meshStandardMaterial color="#dfe8ea" transparent opacity={0.22} roughness={0.1} />
      </mesh>
      <Boite p={[5.25, 0.04, 1.3]} s={[1.35, 0.08, 1.35]} c={C.pierre} r={0.4} />
      <Boite p={[3.85, 0.45, 3.25]} s={[0.55, 0.9, 1.1]} c={C.bois} r={0.6} />
      <Boite p={[3.85, 0.92, 3.25]} s={[0.6, 0.06, 1.15]} c={C.pierre} r={0.3} />
      <Boite p={[3.62, 1.6, 3.25]} s={[0.04, 0.8, 0.9]} c="#cfd8da" r={0.05} />
      <Boite p={[5.5, 0.22, 3.4]} s={[0.4, 0.44, 0.55]} c={C.linge} r={0.4} />
    </group>
  );
}
