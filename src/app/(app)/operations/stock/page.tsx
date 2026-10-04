import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Stock" };

export default async function Page() {
  await exigerAcces("stock");
  return <ComingSoon module="stock" />;
}
