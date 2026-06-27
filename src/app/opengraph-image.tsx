import { ImageResponse } from "next/og";

export const alt = "Dust Busters — Home cleaning in Courtenay, BC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card, generated at build/request time (no asset file).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#070b14",
          color: "#e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#10b981",
            }}
          />
          <div style={{ fontSize: 34, color: "#5eead4", fontWeight: 600 }}>
            Dust Busters
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#ffffff",
            marginTop: 28,
            lineHeight: 1.1,
          }}
        >
          Reliable home cleaning
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#34d399",
            lineHeight: 1.1,
          }}
        >
          in Courtenay &amp; area
        </div>

        <div style={{ display: "flex", fontSize: 34, color: "#94a3b8", marginTop: 36 }}>
          Verified local cleaners · live matching · secure payments
        </div>
      </div>
    ),
    { ...size },
  );
}
