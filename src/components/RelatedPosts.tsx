"use client";

import Link from "next/link";
import type { PostSummary } from "@/data/blog/types";
import { formatDate } from "@/lib/date";
import { hiddenSlugs } from "@/lib/post-visibility";

/**
 * Khối "bài khác" ở cột phải của một bài.
 *
 * Là component client vì cùng lý do với danh sách ở trang chủ: Worker gỡ thẻ
 * `[data-post-slug]` của bài đang ẩn khỏi HTML, nên React phải bỏ y hệt khi
 * hydrate, nếu không nó chèn lại link tới một trang sẽ trả 404.
 */
export default function RelatedPosts({
  title,
  basePath,
  items,
}: {
  title: string;
  basePath: "/blog" | "/notes";
  items: PostSummary[];
}) {
  const hidden = hiddenSlugs();
  const visible = hidden.length ? items.filter((p) => !hidden.includes(p.slug)) : items;

  return (
    <section>
      <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
        {title}
      </h3>
      <ul className="space-y-3 font-sans text-xs">
        {visible.map((other) => (
          <li key={other.slug} data-post-slug={other.slug}>
            <Link
              href={`${basePath}/${other.slug}`}
              className="font-bold text-zinc-800 hover:text-red-700 leading-snug block transition-colors"
            >
              {other.title}
            </Link>
            <span className="font-mono text-[9px] text-zinc-400 uppercase mt-0.5 block">
              {formatDate(other.date)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
