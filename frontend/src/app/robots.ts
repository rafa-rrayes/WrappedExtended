import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/processing/", "/dashboard/", "/account/", "/settings/"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://wrapex.app"}/sitemap.xml`,
  };
}
