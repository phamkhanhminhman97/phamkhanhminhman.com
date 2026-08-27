import { blogPosts } from "@/data/blog";
import { SITE_URL } from "@/lib/site";
import { parseISODate } from "@/lib/date";

/**
 * RSS 2.0 cho blog. Static export chỉ hỗ trợ GET và render sẵn lúc build
 * (node_modules/next/dist/docs/01-app/02-guides/static-exports.md §Route Handlers),
 * nên không đọc gì từ request.
 */
export const dynamic = "force-static";

/** RSS là XML: năm ký tự này phải escape, nếu không feed hỏng ở tiêu đề có & hoặc <. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = blogPosts
    .map((post) => ({ post, date: parseISODate(post.date) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ post, date }) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xmlEscape(post.description)}</description>
      <category>${xmlEscape(post.category)}</category>${
        `\n      <pubDate>${date.toUTCString()}</pubDate>`
      }
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PKMM.ONLINE — Technical Blog</title>
    <link>${SITE_URL}</link>
    <description>Backend engineering, e-commerce API integration, and applied AI research notes.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
