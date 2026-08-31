import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { profile } from "@/data/profile";

const PROFILE_NAME = profile.name;

/**
 * Canonical + feed link for a page. The site is English-only, so there are no
 * hreflang alternates to declare.
 *
 * The RSS `types` entry has to live here rather than in the root layout: a
 * page's own `alternates` replaces the layout's whole block, which would drop
 * the feed link from every page that sets a canonical.
 */
export function alternatesFor(path: string): Metadata["alternates"] {
  return {
    canonical: path,
    types: {
      "application/rss+xml": [
        { url: "/rss.xml", title: `${PROFILE_NAME} — Technical Blog` },
      ],
    },
  };
}

export function openGraphUrl(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/**
 * Phần Open Graph dùng chung cho mọi trang.
 *
 * Next KHÔNG trộn `openGraph` của trang với `openGraph` của layout gốc — trang
 * nào khai khối này là thay thế TOÀN BỘ khối của layout. Nên `siteName` khai ở
 * layout gốc bị mất sạch trên cả bốn trang có metadata riêng (trang chủ,
 * /about, từng bài blog, từng trang dự án). Đo trên HTML build: không trang nào
 * có thẻ `og:site_name`.
 *
 * Điều đó đáng sửa vì `og:site_name` là chuỗi Google in ngay dưới đường link
 * trong kết quả tìm kiếm, và Facebook/Zalo in trên thẻ xem trước — thiếu nó thì
 * chỗ đó trống hoặc trình duyệt tự đoán từ tên miền.
 */
export function openGraphFor(path: string, title: string, description: string) {
  return {
    title,
    description,
    url: openGraphUrl(path),
    siteName: PROFILE_NAME,
    locale: "en_US",
  };
}
