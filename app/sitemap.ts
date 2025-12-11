import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const now = new Date();

  // 主要な静的ページを列挙（動的な動画ページは認証都合で除外）
  const routes = [
    { path: "/", priority: 1.0 as number, changeFrequency: "weekly" as const },
    { path: "/progress", priority: 0.8 as number, changeFrequency: "weekly" as const },
    { path: "/progress/new", priority: 0.5 as number, changeFrequency: "weekly" as const },
    { path: "/intervals", priority: 0.6 as number, changeFrequency: "weekly" as const },
    { path: "/intervals/quiz", priority: 0.5 as number, changeFrequency: "weekly" as const },
    { path: "/intervals/triads", priority: 0.5 as number, changeFrequency: "weekly" as const },
    { path: "/intervals/tetrads", priority: 0.5 as number, changeFrequency: "weekly" as const },
  ];

  const urls: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    priority: r.priority,
    changeFrequency: r.changeFrequency,
  }));

  return urls;
}
