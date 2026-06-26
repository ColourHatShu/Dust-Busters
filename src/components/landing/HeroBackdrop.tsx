"use client";

import { useRef } from "react";

// Deterministic pseudo-random so server and client markup match (no hydration
// mismatch). 24 floating "dust" motes — on-theme for Dust Busters.
const PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * n) * 10000;
    return x - Math.floor(x); // 0..1
  };
  return {
    left: Math.round(r(12.9898) * 100),
    top: Math.round(r(78.233) * 100),
    size: 2 + Math.round(r(43.123) * 5),
    delay: Math.round(r(7.31) * 8000),
    dur: 7000 + Math.round(r(2.17) * 9000),
    drift: Math.round((r(91.7) - 0.5) * 60),
    op: 0.15 + r(3.7) * 0.5,
  };
});

export default function HeroBackdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className="hero-fx pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Aurora blobs */}
      <span className="aurora aurora-1" />
      <span className="aurora aurora-2" />
      <span className="aurora aurora-3" />

      {/* Perspective grid floor */}
      <div className="hero-grid" />

      {/* Cursor spotlight */}
      <div className="hero-spotlight" />

      {/* Floating dust motes */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="mote"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.op,
            // @ts-expect-error custom props
            "--drift": `${p.drift}px`,
            "--dur": `${p.dur}ms`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}

      {/* Top fade into the navbar + bottom fade into the page */}
      <div className="hero-vignette" />
    </div>
  );
}
