import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Onboarding" };

export default async function Page() {
  await exigerAcces("onboarding");
  return <ComingSoon module="onboarding" />;
}
