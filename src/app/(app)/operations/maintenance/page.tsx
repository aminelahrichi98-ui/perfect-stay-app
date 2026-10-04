import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Maintenance" };

export default async function Page() {
  await exigerAcces("maintenance");
  return <ComingSoon module="maintenance" />;
}
