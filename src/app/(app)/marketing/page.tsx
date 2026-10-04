import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Marketing" };

export default async function Page() {
  await exigerAcces("marketing");
  return <ComingSoon module="marketing" />;
}
