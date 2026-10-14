import { blogPosts } from "./index";
import { notesPosts } from "./notes";
import type { BlogPost } from "./types";

/**
 * Cả hai loại bài, dành cho code CHẠY Ở SERVER lúc build (sitemap, manifest cho
 * trang admin). Đừng import từ component client: sẽ kéo toàn bộ nội dung bài —
 * và KaTeX — vào bundle trình duyệt.
 *
 * Trạng thái ẩn / ghim ở KV (`POST_META`) khoá theo slug, nên slug phải duy nhất
 * giữa blog và notes. Kiểm ngay lúc build để lỗi hiện ra khi `npm run build`
 * thay vì thành một bài ẩn nhầm bài khác trên production.
 */
export const allPosts: BlogPost[] = [...notesPosts, ...blogPosts];

const seen = new Set<string>();
for (const post of allPosts) {
  if (seen.has(post.slug)) {
    throw new Error(`Slug trùng giữa blog và notes: "${post.slug}" (KV POST_META khoá theo slug)`);
  }
  seen.add(post.slug);
}
for (const post of notesPosts) {
  if (post.section !== "notes") {
    throw new Error(`Bài "${post.slug}" nằm trong notes.ts nhưng thiếu section: "notes"`);
  }
}
for (const post of blogPosts) {
  if (post.section === "notes") {
    throw new Error(`Bài "${post.slug}" nằm trong index.ts (blog) nhưng có section: "notes"`);
  }
}
