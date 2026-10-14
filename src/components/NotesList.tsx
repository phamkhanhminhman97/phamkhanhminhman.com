"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import type { PostSummary } from "@/data/blog/types";
import { copy } from "@/content/copy";
import { formatDate } from "@/lib/date";
import { hiddenSlugs } from "@/lib/post-visibility";

const t = copy.notes;

/**
 * Danh sách ghi chú ở /notes.
 *
 * Dùng cùng khuôn với danh sách bài ở trang chủ để Worker áp được ẩn / ghim /
 * đổi thứ tự cho nó: container `.blog-list`, mỗi thẻ là `.blog-card` có
 * `data-post-slug`. Là component client vì Worker gỡ thẻ của bài đang ẩn khỏi
 * HTML và React phải bỏ y hệt khi hydrate, nếu không nó chèn lại thẻ đó.
 *
 * Câu "chưa có ghi chú" luôn nằm trong DOM và chỉ hiện khi danh sách rỗng (xem
 * `.notes-empty` trong globals.css), để trường hợp ẩn hết bài cũng khớp với
 * HTML mà Worker trả về.
 */
export default function NotesList({ posts }: { posts: PostSummary[] }) {
  const hidden = hiddenSlugs();
  const visible = hidden.length ? posts.filter((p) => !hidden.includes(p.slug)) : posts;

  return (
    <>
      <div className="blog-list flex flex-col gap-6">
        {visible.map((post) => (
          <article key={post.slug} data-post-slug={post.slug} className="blog-card">
            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs font-mono text-zinc-500 uppercase tracking-wide">
              <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] text-red-700 font-semibold">
                {post.category}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(post.date)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {post.readTime}
              </span>
            </div>

            <h2 className="font-serif-body font-bold text-xl md:text-2xl text-zinc-950 hover:text-red-700 transition-colors mb-2">
              <Link href={`/notes/${post.slug}`}>{post.title}</Link>
            </h2>

            <p className="font-serif-body text-sm text-zinc-700 leading-relaxed">
              {post.description}
            </p>

            <div className="mt-3">
              <Link
                href={`/notes/${post.slug}`}
                className="font-mono text-xs font-bold text-zinc-900 hover:text-red-700 inline-flex items-center gap-1 uppercase"
              >
                {t.readNote} &rarr;
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="notes-empty py-12 text-center border border-dashed border-zinc-300 rounded-lg text-zinc-500 font-mono text-xs">
        {t.emptyNotice}
      </div>
    </>
  );
}
