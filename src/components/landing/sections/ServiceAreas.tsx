import { MapPin, Navigation, Radar } from "lucide-react";
import Reveal from "@/components/landing/Reveal";

/**
 * Service-area teaser: a stylized, futuristic mini "map" (no map library) with
 * three glowing pulsing nodes for the towns we serve, faint connecting routes,
 * and a subtle radar sweep around the valley hub. Foreshadows the upcoming live
 * cleaner map. Pure CSS/SVG, SSR-safe, deterministic positions (no randomness).
 */

type Town = {
  name: string;
  tag: string;
  /** Position in the 0–100 map space (left%, top%). Deterministic. */
  x: number;
  y: number;
  hub?: boolean;
};

// Roughly mirrors the valley's real layout: Courtenay central (hub),
// Comox to the NE coast, Cumberland to the SW.
const TOWNS: Town[] = [
  { name: "Courtenay", tag: "Valley hub", x: 50, y: 50, hub: true },
  { name: "Comox", tag: "By the bay", x: 76, y: 30 },
  { name: "Cumberland", tag: "Historic village", x: 25, y: 70 },
];

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, 2],
  [1, 2],
];

const HUB = TOWNS[0];

export default function ServiceAreas() {
  return (
    <section className="area-section w-full px-6 py-24">
      {/* Ambient dark-futuristic backdrop (decorative) */}
      <span className="area-glow area-glow--a" aria-hidden="true" />
      <span className="area-glow area-glow--b" aria-hidden="true" />
      <div className="area-grid" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-200">
            <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Service area
          </span>
          <h2 className="text-white">
            We serve the <span className="title-gradient">Comox Valley</span>
          </h2>
          <p className="max-w-xl text-slate-300">
            Proudly serving Courtenay, Comox &amp; Cumberland — verified local
            cleaners, just minutes away.
          </p>
        </Reveal>

        <Reveal delay={120} className="w-full">
          <div className="area-panel w-full p-4 sm:p-6">
            <div className="area-map">
              {/* Radar range rings + rotating sweep, centered on the hub */}
              <div
                className="area-rings"
                style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
                aria-hidden="true"
              />
              <div
                className="area-radar-wrap"
                style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
                aria-hidden="true"
              >
                <span className="area-radar" />
              </div>

              {/* Connecting routes (faint base + flowing energy) */}
              <svg
                className="area-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {EDGES.map(([a, b], i) => (
                  <line
                    key={`base-${i}`}
                    className="area-line"
                    x1={TOWNS[a].x}
                    y1={TOWNS[a].y}
                    x2={TOWNS[b].x}
                    y2={TOWNS[b].y}
                  />
                ))}
                {EDGES.map(([a, b], i) => (
                  <line
                    key={`flow-${i}`}
                    className="area-flow"
                    x1={TOWNS[a].x}
                    y1={TOWNS[a].y}
                    x2={TOWNS[b].x}
                    y2={TOWNS[b].y}
                    style={{ animationDelay: `${i * 0.7}s` }}
                  />
                ))}
              </svg>

              {/* Town nodes */}
              {TOWNS.map((t, i) => (
                <div
                  key={t.name}
                  className="area-pin"
                  style={{ left: `${t.x}%`, top: `${t.y}%` }}
                >
                  {[0, 1].map((ring) => (
                    <span
                      key={ring}
                      className="area-ping"
                      style={{ animationDelay: `${i * 0.5 + ring}s` }}
                      aria-hidden="true"
                    />
                  ))}
                  <span className={`area-dot${t.hub ? " area-dot--hub" : ""}`}>
                    {t.hub ? (
                      <Navigation
                        className="h-4 w-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    ) : (
                      <MapPin
                        className="h-4 w-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="area-label">
                    <span className="area-name">{t.name}</span>
                    <span className="area-tag">{t.tag}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-300">
            <Radar
              className="h-4 w-4 text-emerald-300"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Live cleaner map
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-emerald-300">coming soon</span>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
