import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Logements" };

export default async function Page() {
  await exigerAcces("logements");
  return <ComingSoon module="logements" />;
}
