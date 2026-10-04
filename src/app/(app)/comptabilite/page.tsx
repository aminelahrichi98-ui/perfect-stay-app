import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Comptabilité" };

export default async function Page() {
  await exigerAcces("comptabilite");
  return <ComingSoon module="comptabilite" />;
}
