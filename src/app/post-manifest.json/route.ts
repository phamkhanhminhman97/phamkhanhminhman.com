import { blogPosts } from "@/data/blog";

/**
 * Danh sách bài ở dạng JSON tĩnh, sinh ra lúc build.
 *
 * Worker không đọc được `blog.tsx` (đó là React component nằm trong bundle của
 * trang), nên trang admin cần một nguồn biết "hiện có những bài nào". Route
 * Handler không đụng tới `request` nên chạy được với static export
 * (node_modules/next/dist/docs/01-app/02-guides/static-exports.md).
 */
export const dynamic = "force-static";

export async function GET() {
  const posts = blogPosts.map((p) => ({
    slug: p.slug,
    date: p.date,
    category: p.category,
    availableIn: p.availableIn,
    title: p.title,
  }));

  return new Response(JSON.stringify({ posts }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
