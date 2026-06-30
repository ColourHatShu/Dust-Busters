import type { MetadataRoute } from "next";

// PWA manifest — makes Dust Busters installable ("Add to Home Screen") on phones,
// which matters for a mobile-first home-services app: customers track live
// matching + pay from their phone, cleaners react to offers on the go. Icons are
// generated (no asset files) by the /icons/192 + /icons/512 route handlers.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dust Busters — Home Cleaning",
    short_name: "Dust Busters",
    description:
      "Book a trusted, ID-verified home cleaner in Courtenay, BC — live matching, secure payments.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070b14",
    theme_color: "#070b14",
    categories: ["lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
