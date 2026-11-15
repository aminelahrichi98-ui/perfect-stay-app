"use client";

/*
  Scène 3D interactive : l'appartement, sa lumière, les points de service et la caméra.
  Chargée à la demande (jamais au premier affichage) et mise en pause hors écran.
*/
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Appartement } from "./modele";

/** Position de chaque point de service dans l'appartement (mètres) */
export const POSITIONS: Record<string, [number, number, number]> = {
  revenus: [-2.6, 1.35, 1.8],
  reservations: [1.35, 1.25, 2.6],
  reporting: [-1.2, 1.3, -2.3],
  verification: [1.9, 1.15, 3.7],
  communication: [-4.2, 1.45, -2.2],
  menage: [3.6, 1.25, -2.6],
  qualite: [4.6, 1.6, 2.0],
  maintenance: [-5.0, 1.75, -3.55],
  dommages: [5.4, 1.5, -1.2],
};

const VUE_GENERALE = { position: new THREE.Vector3(13.5, 12.5, 14), cible: new THREE.Vector3(0, 0.2, 0.2) };

function Regie({ selection, controles }: { selection: string | null; controles: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, size } = useThree();
  const anime = useRef(true);
  const objectif = useRef({ position: VUE_GENERALE.position.clone(), cible: VUE_GENERALE.cible.clone() });

  useEffect(() => {
    const p = selection ? POSITIONS[selection] : null;
    const portrait = size.width < size.height;
    if (p) {
      const cible = new THREE.Vector3(p[0], p[1] * 0.5, p[2]);
      // Même angle de vue que la vue générale, plus proche du point choisi
      const direction = VUE_GENERALE.position.clone().sub(VUE_GENERALE.cible).normalize();
      objectif.current = { cible, position: cible.clone().add(direction.multiplyScalar(portrait ? 19 : 14)) };
    } else {
      const recul = portrait ? 1.75 : 1;
      objectif.current = { cible: VUE_GENERALE.cible.clone(), position: VUE_GENERALE.position.clone().multiplyScalar(recul) };
    }
    anime.current = true;
  }, [selection, size.width, size.height]);

  useFrame((_, delta) => {
    const c = controles.current;
    if (!c || !anime.current) return;
    const k = 1 - Math.exp(-delta * 2.6);
    camera.position.lerp(objectif.current.position, k);
    c.target.lerp(objectif.current.cible, k);
    c.update();
    if (camera.position.distanceTo(objectif.current.position) < 0.02) anime.current = false;
  });

  // Dès que le visiteur fait pivoter la vue, la chorégraphie s'efface devant lui
  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const stop = () => (anime.current = false);
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controles]);

  return null;
}

/**
 * Projette chaque point de service sur l'écran à chaque image : les boutons restent de vrais
 * éléments HTML (accessibles au clavier), posés au-dessus de la maquette.
 */
function Projecteur({ ancres }: { ancres: React.RefObject<Record<string, HTMLElement | null>> }) {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    for (const [id, el] of Object.entries(ancres.current)) {
      const p = POSITIONS[id];
      if (!el || !p) continue;
      v.current.set(p[0], p[1], p[2]).project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      const devant = v.current.z < 1;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.visibility = devant ? "visible" : "hidden";
    }
  });
  return null;
}

export default function SceneAppartement({
  ancres,
  selection,
  enPause,
  leger,
}: {
  /** Boutons HTML des points de service, positionnés par la scène */
  ancres: React.RefObject<Record<string, HTMLElement | null>>;
  selection: string | null;
  enPause: boolean;
  /** Téléphones : pas d'ombres portées, résolution plafonnée */
  leger: boolean;
}) {
  const controles = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas
      shadows={!leger}
      dpr={leger ? [1, 1.5] : [1, 1.75]}
      frameloop={enPause ? "never" : "always"}
      camera={{ position: VUE_GENERALE.position.toArray(), fov: 28, near: 0.5, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-label="Maquette 3D interactive d'un appartement géré par Perfect Stay"
      role="img"
    >
      <color attach="background" args={["#111315"]} />
      <fog attach="fog" args={["#111315", 48, 90]} />

      {/* Lumière de fin d'après-midi : soleil bas par les fenêtres du séjour, ciel doux, lampes chaudes */}
      <hemisphereLight args={["#f5f2ec", "#1c1f22", 0.55]} />
      <ambientLight intensity={0.18} color="#f3e6d0" />
      <directionalLight
        position={[-14, 9, 4]}
        intensity={2.4}
        color="#f6dfb8"
        castShadow={!leger}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[10, 14, 12]} intensity={0.55} color="#dfe6ee" />
      <pointLight position={[-4.2, 1.9, -2.2]} intensity={2.2} distance={4} color="#f2c98c" />
      <pointLight position={[-0.7, 1.5, 3.5]} intensity={1.6} distance={3.5} color="#f2c98c" />
      <pointLight position={[3.6, 0.9, -3.4]} intensity={1.4} distance={3} color="#f2c98c" />

      <Appartement />
      <ContactShadows position={[0, -0.3, 0]} scale={22} blur={2.6} opacity={0.55} far={4} frames={1} />

      <Projecteur ancres={ancres} />

      <OrbitControls
        ref={controles}
        makeDefault
        enablePan={false}
        enableZoom={!leger}
        minDistance={7}
        maxDistance={50}
        minPolarAngle={0.55}
        maxPolarAngle={1.15}
        rotateSpeed={0.55}
        enableDamping
        dampingFactor={0.08}
      />
      <Regie selection={selection} controles={controles} />
    </Canvas>
  );
}
