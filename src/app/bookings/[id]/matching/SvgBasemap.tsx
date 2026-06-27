"use client";

// Stylized static fallback basemap — shown when the real tiles fail to load
// (offline / blocked). Never a broken gray box. Honest: it's a representation,
// not real streets. Consumes the SAME {center, pins} contract as LeafletBasemap.

type Pin = { k: string; lat: number; lng: number; state: string };

const W = 400;
const H = 340;
const SPAN_KM = 6; // full width ≈ 6 km

export default function SvgBasemap({
  center,
  pins,
}: {
  center: { lat: number; lng: number };
  pins: Pin[];
}) {
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const pxPerKm = W / SPAN_KM;

  const project = (lat: number, lng: number) => {
    const dxKm = (lng - center.lng) * kmPerDegLng;
    const dyKm = (lat - center.lat) * kmPerDegLat;
    return {
      x: Math.max(8, Math.min(W - 8, W / 2 + dxKm * pxPerKm)),
      y: Math.max(8, Math.min(H - 8, H / 2 - dyKm * pxPerKm)),
    };
  };

  return (
    <svg
      className="matching-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Approximate map of nearby cleaners"
    >
      <rect width={W} height={H} fill="#0b1220" />

      {/* faint grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i * W) / 8}
          y1={0}
          x2={(i * W) / 8}
          y2={H}
          stroke="rgba(148,233,213,0.06)"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={(i * H) / 7}
          x2={W}
          y2={(i * H) / 7}
          stroke="rgba(148,233,213,0.06)"
        />
      ))}

      {/* coverage rings around the customer centre */}
      {[1, 2, 3].map((r) => (
        <circle
          key={r}
          cx={W / 2}
          cy={H / 2}
          r={r * pxPerKm}
          fill="none"
          stroke="rgba(45,212,191,0.18)"
        />
      ))}

      {/* cleaner pins */}
      {pins.map((p) => {
        const { x, y } = project(p.lat, p.lng);
        const won = p.state === "accepted";
        return (
          <g key={p.k}>
            <circle
              cx={x}
              cy={y}
              r={9}
              fill="none"
              stroke={won ? "rgba(34,211,238,0.5)" : "rgba(16,185,129,0.5)"}
              className="svgpin-ring"
            />
            <circle cx={x} cy={y} r={5} fill={won ? "#22d3ee" : "#10b981"} />
          </g>
        );
      })}

      {/* customer centre */}
      <circle cx={W / 2} cy={H / 2} r={6} fill="#0ea5e9" stroke="#fff" strokeWidth={2} />

      <text x={W - 8} y={H - 8} textAnchor="end" fontSize="10" fill="#475569">
        Map preview
      </text>
    </svg>
  );
}
