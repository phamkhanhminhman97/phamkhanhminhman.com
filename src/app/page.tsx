import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { blogPosts, toSummary } from "@/data/blog";
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
  // Chỉ metadata đi qua props: HomePage là component client, nếu nó import
  // registry thì nội dung mọi bài nằm trong bundle trình duyệt.
  return <HomePage posts={blogPosts.map(toSummary)} />;
}
