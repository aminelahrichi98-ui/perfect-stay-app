import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Check-lists" };

export default async function Page() {
  await exigerAcces("checklists");
  return <ComingSoon module="checklists" />;
}
