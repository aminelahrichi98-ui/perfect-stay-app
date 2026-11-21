import { SousOnglets } from "./sous-onglets";

export const metadata = { title: "Creative Intelligence" };

export default function LayoutCreative({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SousOnglets />
      {children}
    </>
  );
}
