import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphFor } from "@/lib/seo";

const t = copy.home;

export const metadata: Metadata = {
  title: { absolute: t.metaTitle },
  description: t.metaDescription,
  alternates: alternatesFor("/"),
  openGraph: openGraphFor("/", t.metaTitle, t.metaDescription),
};

export default function Page() {
  return <HomePage />;
}
