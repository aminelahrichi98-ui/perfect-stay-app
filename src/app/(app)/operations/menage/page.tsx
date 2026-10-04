import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Ménage" };

export default async function Page() {
  await exigerAcces("menage");
  return <ComingSoon module="menage" />;
}
