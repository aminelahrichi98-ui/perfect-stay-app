import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Stratégie entreprise" };

export default async function Page() {
  await exigerAcces("strategie");
  return <ComingSoon module="strategie" />;
}
