import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog";
import { npmPackages } from "@/data/projects";
import { SITE_URL as BASE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
