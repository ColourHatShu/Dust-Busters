"use client";

// Client-only Leaflet map — imported via next/dynamic(ssr:false) so Leaflet's
// window access never runs on the server. Markers use L.divIcon (pure CSS) to
// avoid Leaflet's bundler marker-image 404.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";

export type Pin = { k: string; lat: number; lng: number; state: string };

function pinIcon(state: string) {
  return L.divIcon({
    className: "map-pin-wrap",
    html: `<span class="${state === "accepted" ? "map-pin map-pin-won" : "map-pin"}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const centerIcon = L.divIcon({
  className: "map-pin-wrap",
  html: `<span class="map-center"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Auto-frame the map to fit the area center + every cleaner pin, so nearby
// cleaners are always in view regardless of how the fuzzed positions spread.
// Re-fits only when the *set* of pins changes (stable across the 2.5s polls), so
// the view doesn't jump on every refresh.
function FitBounds({
  center,
  pins,
}: {
  center: { lat: number; lng: number };
  pins: Pin[];
}) {
  const map = useMap();
  const sig = pins.map((p) => p.k).sort().join("|");
  useEffect(() => {
    const pts: [number, number][] = [
      [center.lat, center.lng],
      ...pins.map((p) => [p.lat, p.lng] as [number, number]),
    ];
    if (pts.length <= 1) {
      map.setView([center.lat, center.lng], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [44, 44], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sig, center.lat, center.lng]);
  return null;
}

export default function LeafletBasemap({
  center,
  pins,
  onTileFail,
}: {
  center: { lat: number; lng: number };
  pins: Pin[];
  onTileFail?: () => void;
}) {
  // Detect a real tile outage (offline/blocked) vs the odd edge 404: if no tile
  // has loaded but several errored, or nothing loaded within 6s, fall back.
  const okRef = useRef(false);
  const errRef = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!okRef.current && errRef.current > 0) onTileFail?.();
    }, 6000);
    return () => clearTimeout(t);
  }, [onTileFail]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="matching-map"
    >
      {/* Dark basemap (CARTO Dark Matter) — free, no API key — to match the
          app's dark/futuristic theme. */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        eventHandlers={{
          tileload: () => {
            okRef.current = true;
          },
          tileerror: () => {
            errRef.current += 1;
            if (!okRef.current && errRef.current >= 4) onTileFail?.();
          },
        }}
      />
      {/* Coverage ring around the customer's area — makes "cleaners near you"
          read at a glance (positions are fuzzed within the service area). */}
      <Circle
        center={[center.lat, center.lng]}
        radius={2200}
        pathOptions={{
          color: "#10b981",
          weight: 1,
          opacity: 0.5,
          fillColor: "#10b981",
          fillOpacity: 0.06,
        }}
      />
      <Marker position={[center.lat, center.lng]} icon={centerIcon} />
      {pins.map((p) => (
        <Marker key={p.k} position={[p.lat, p.lng]} icon={pinIcon(p.state)} />
      ))}
      <FitBounds center={center} pins={pins} />
    </MapContainer>
  );
}
