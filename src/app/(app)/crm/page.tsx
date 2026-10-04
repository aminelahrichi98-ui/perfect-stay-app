import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "CRM" };

export default async function Page() {
  await exigerAcces("crm");
  return <ComingSoon module="crm" />;
}
