import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphUrl } from "@/lib/seo";

const t = copy.home;

export const metadata: Metadata = {
  title: { absolute: t.metaTitle },
  description: t.metaDescription,
  alternates: alternatesFor("/"),
  openGraph: {
    title: t.metaTitle,
    description: t.metaDescription,
    locale: "en_US",
    url: openGraphUrl("/"),
  },
};

export default function Page() {
  return <HomePage />;
}
