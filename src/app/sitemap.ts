import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog";
import { npmPackages } from "@/data/projects";
import { SITE_URL as BASE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Lần sửa nội dung thật gần nhất của các trang không phải blog (trang chủ,
 * /about, /projects/*).
 *
 * Sửa tay khi thật sự viết lại nội dung các trang đó. Cố ý KHÔNG dùng
 * `new Date()`: xem ghi chú ở phần blog bên dưới.
 */
const CONTENT_UPDATED = "2026-09-18";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      // Trang chủ đổi khi nội dung giới thiệu / danh sách mục đổi, không phải
      // mỗi lần build. Cùng lý do với /projects/* ở dưới.
      lastModified: new Date(CONTENT_UPDATED),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(CONTENT_UPDATED),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    // `lastModified` lấy NGÀY THẬT của bài, không phải new Date().
    //
    // Trước đây mọi URL đều báo "vừa sửa lúc build", tức là mỗi lần deploy là
    // cả sitemap tự nhận vừa thay đổi toàn bộ. Google đối chiếu với nội dung
    // thật thấy không đổi gì, nên dần bỏ qua trường này của cả site — mất luôn
    // tác dụng của nó với những bài thật sự có cập nhật.
    ...blogPosts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...npmPackages.map((pkg) => ({
      url: `${BASE_URL}/projects/${pkg.id}`,
      // Cùng lý do với blog ở trên: `new Date()` khiến mỗi lần deploy là cả
      // nhóm URL này tự nhận vừa đổi, trong khi nội dung không đổi. Nội dung
      // trang dự án nằm trong `data/projects.tsx`, nên mốc đúng là lần sửa
      // file đó — chốt lại thành hằng số, cập nhật khi thật sự viết lại.
      lastModified: new Date(CONTENT_UPDATED),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
