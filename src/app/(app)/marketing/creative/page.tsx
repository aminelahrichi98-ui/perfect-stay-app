import { exigerAcces, peutModifier } from "@/lib/auth";
import { Angles } from "./angles";
import { charger, ScriptAFaire } from "./commun";
import { LectureSeule } from "./elements";
import { chargerAngles } from "./donnees";

export default async function PageAngles() {
  const u = await exigerAcces("marketing");
  const angles = await charger(chargerAngles);
  if (!angles) return <ScriptAFaire />;
  const modifiable = peutModifier(u, "marketing");
  return (
    <div className="space-y-4">
      {modifiable ? null : <LectureSeule />}
      <Angles angles={angles} modifiable={modifiable} />
    </div>
  );
}
