import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

// 512x512 PWA icon (referenced by app/manifest.ts, incl. maskable). Generated.
export function GET() {
  return new ImageResponse(brandMark(512), { width: 512, height: 512 });
}
