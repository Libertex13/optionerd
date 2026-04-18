import type { MetadataRoute } from "next";
import { getAllStrategySlugs } from "@/lib/strategies/definitions";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://optionerd.com";

  const strategyPages = getAllStrategySlugs().map((slug) => ({
    url: `${baseUrl}/calculator/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/strategies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/trades`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...strategyPages,
  ];
}
