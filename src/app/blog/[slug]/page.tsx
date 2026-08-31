import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogArticle from "@/components/BlogArticle";
import { blogPosts } from "@/data/blog";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { profile } from "@/data/profile";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.description,
    alternates: alternatesFor(`/blog/${post.slug}`),
    openGraph: {
      ...openGraphFor(`/blog/${post.slug}`, post.title, post.description),
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
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();
  return (
    <>
      {/* Article schema, tác giả trỏ về cùng @id Person của cả site.

          Đây là chỗ mỗi bài viết kỹ thuật đóng góp ngược lại cho truy vấn tên:
          Google thấy một loạt bài có chiều sâu chuyên môn cùng gắn về một người,
          nên thực thể "Phạm Khánh Minh Mẫn" trở nên rõ ràng và đáng tin hơn so
          với một trang hồ sơ đứng trơ trọi. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `${SITE_URL}/blog/${post.slug}#article`,
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            articleSection: post.category,
            inLanguage: "en",
            url: `${SITE_URL}/blog/${post.slug}`,
            mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
            author: { "@id": `${SITE_URL}/#person` },
            publisher: { "@id": `${SITE_URL}/#person` },
            isPartOf: { "@id": `${SITE_URL}/#website` },
            keywords: [post.category, ...profile.alternateNames],
          }),
        }}
      />
      <BlogArticle post={post} />
    </>
  );
}
