import { ImageResponse } from "next/og";

export const alt = "Perfect Stay · La location courte durée, version investisseur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImageOg() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#111315", color: "#f5f2ec", padding: 72 }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#b98aac" }}>PERFECT STAY · CASABLANCA</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, maxWidth: 950 }}>Votre appartement mérite une meilleure stratégie.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#d9cdbd" }}>La location courte durée, version investisseur.</div>
        </div>
        <div style={{ display: "flex", height: 2, width: 160, background: "#b98aac" }} />
      </div>
    ),
    size,
  );
}
