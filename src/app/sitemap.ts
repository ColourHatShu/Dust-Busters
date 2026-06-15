import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = ["/", "/about", "/book", "/login"];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
  }));
}
