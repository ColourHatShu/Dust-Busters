import { ImageResponse } from "next/og";
import { brandMark } from "@/lib/brand-mark";

// 192x192 PWA icon (referenced by app/manifest.ts). Generated, no asset file.
export function GET() {
  return new ImageResponse(brandMark(192), { width: 192, height: 192 });
}
