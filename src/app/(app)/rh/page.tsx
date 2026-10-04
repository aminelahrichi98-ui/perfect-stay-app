import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "RH" };

export default async function Page() {
  await exigerAcces("rh");
  return <ComingSoon module="rh" />;
}
