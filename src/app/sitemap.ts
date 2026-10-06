import type { MetadataRoute } from "next";
import { kits, tools } from "@/lib/tools";
import { formSpecs } from "@/lib/formSpecs";
import { alternatives } from "@/lib/alternatives";
import { siteUrl } from "@/lib/toolSeo";

const TARGET_KB_SIZES = ["10kb", "15kb", "20kb", "25kb", "30kb", "50kb", "100kb", "150kb", "200kb", "250kb", "300kb", "500kb", "1mb", "2mb"];
const PASSPORT_PRESETS = ["india-passport", "us-passport", "us-visa", "schengen-visa", "uk-visa", "pan-card", "standard-35x45"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/forms`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/alternatives`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  const kitRoutes: MetadataRoute.Sitemap = kits.map((kit) => ({
    url: `${siteUrl}/${kit.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const formRoutes: MetadataRoute.Sitemap = formSpecs.map((spec) => ({
    url: `${siteUrl}/forms/${spec.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const alternativeRoutes: MetadataRoute.Sitemap = alternatives.map((alt) => ({
    url: `${siteUrl}/alternatives/${alt.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const variantRoutes: MetadataRoute.Sitemap = [
    ...TARGET_KB_SIZES.map((size) => `${siteUrl}/tools/target-kb/${size}`),
    ...PASSPORT_PRESETS.map((preset) => `${siteUrl}/tools/passport-photo/${preset}`),
  ].map((url) => ({
    url,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...kitRoutes, ...toolRoutes, ...formRoutes, ...alternativeRoutes, ...variantRoutes];
}
