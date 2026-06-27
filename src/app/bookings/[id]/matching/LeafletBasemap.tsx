"use client";

// Client-only Leaflet map — imported via next/dynamic(ssr:false) so Leaflet's
// window access never runs on the server. Markers use L.divIcon (pure CSS) to
// avoid Leaflet's bundler marker-image 404.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

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
      <Marker position={[center.lat, center.lng]} icon={centerIcon} />
      {pins.map((p) => (
        <Marker key={p.k} position={[p.lat, p.lng]} icon={pinIcon(p.state)} />
      ))}
    </MapContainer>
  );
}
