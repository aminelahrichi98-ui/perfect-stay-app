import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Tâches" };

export default async function Page() {
  await exigerAcces("taches");
  return <ComingSoon module="taches" />;
}
