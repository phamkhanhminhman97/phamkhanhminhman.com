import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Canonical + feed link for a page. The site is English-only, so there are no
 * hreflang alternates to declare.
 *
 * The RSS `types` entry has to live here rather than in the root layout: a
 * page's own `alternates` replaces the layout's whole block, which would drop
 * the feed link from every page that sets a canonical.
 */
export function alternatesFor(path: string): Metadata["alternates"] {
  return {
    canonical: path,
    types: {
      "application/rss+xml": [
        { url: "/rss.xml", title: "PKMM.ONLINE — Technical Blog" },
      ],
    },
  };
}

export function openGraphUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
