import type { Metadata } from "next";
import AboutPage from "@/components/AboutPage";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphUrl } from "@/lib/seo";

const t = copy.about;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  alternates: alternatesFor("/about"),
  openGraph: {
    type: "profile",
    title: t.metaTitle,
    description: t.metaDescription,
    locale: "en_US",
    url: openGraphUrl("/about"),
  },
};

export default function Page() {
  return <AboutPage />;
}
