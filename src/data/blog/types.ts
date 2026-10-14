import React from "react";

/**
 * The site is English-only. Posts carry plain strings and one render function —
 * there is no locale variant to keep in sync.
 */
export interface BlogPost {
  slug: string;
  /** ISO `YYYY-MM-DD`, formatted for display at render time. */
  date: string;
  category: string;
  title: string;
  readTime: string;
  description: string;
  /** Section identifier: "blog" (default, technical articles) or "notes" (study notes). */
  section?: "blog" | "notes";
  content: () => React.JSX.Element;
}

/**
 * Phần metadata của bài, không kèm `content`.
 *
 * Component client (trang chủ, danh sách notes, khối "bài khác") chỉ nhận loại
 * này qua props. Nếu chúng import thẳng `BlogPost` từ registry thì toàn bộ nội
 * dung mọi bài — kể cả KaTeX của bài notes — bị đóng gói vào bundle trình duyệt.
 */
export type PostSummary = Omit<BlogPost, "content">;

export function toSummary(post: BlogPost): PostSummary {
  return {
    slug: post.slug,
    date: post.date,
    category: post.category,
    title: post.title,
    readTime: post.readTime,
    description: post.description,
    section: post.section,
  };
}
