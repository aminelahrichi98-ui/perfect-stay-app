import { ComingSoon } from "@/components/coming-soon";
import { exigerAcces } from "@/lib/auth";

export const metadata = { title: "Calendrier" };

export default async function Page() {
  await exigerAcces("calendrier");
  return <ComingSoon module="calendrier" />;
}
