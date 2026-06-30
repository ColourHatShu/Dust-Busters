import type { ReactElement } from "react";

// Asset-free Dust Busters app icon, rendered via next/og ImageResponse for the
// PWA manifest icons + the iOS home-screen icon. A centered emerald "DB"
// monogram on the brand-dark background, with ~38% padding so it survives a
// maskable (rounded/circular) crop. Matches opengraph-image.tsx.
export function brandMark(px: number): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070b14",
      }}
    >
      <div
        style={{
          width: px * 0.62,
          height: px * 0.62,
          borderRadius: px * 0.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: px * 0.3,
          letterSpacing: -px * 0.01,
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        }}
      >
        DB
      </div>
    </div>
  );
}
