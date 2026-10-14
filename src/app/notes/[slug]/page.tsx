import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticle from "@/components/BlogArticle";
import { notesPosts } from "@/data/blog/notes";
import { toSummary } from "@/data/blog/types";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { profile } from "@/data/profile";

export function generateStaticParams() {
  return notesPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = notesPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.description,
    alternates: alternatesFor(`/notes/${post.slug}`),
    openGraph: {
      ...openGraphFor(`/notes/${post.slug}`, post.title, post.description),
      type: "article",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = notesPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `${SITE_URL}/notes/${post.slug}#article`,
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            articleSection: post.category,
            inLanguage: "en",
            url: `${SITE_URL}/notes/${post.slug}`,
            mainEntityOfPage: `${SITE_URL}/notes/${post.slug}`,
            author: { "@id": `${SITE_URL}/#person` },
            publisher: { "@id": `${SITE_URL}/#person` },
            isPartOf: { "@id": `${SITE_URL}/#website` },
            keywords: [post.category, ...profile.alternateNames],
          }),
        }}
      />
      <BlogArticle
        post={post}
        related={notesPosts.filter((p) => p.slug !== post.slug).map(toSummary)}
      />
    </>
  );
}
