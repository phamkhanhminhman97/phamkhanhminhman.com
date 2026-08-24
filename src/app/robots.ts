import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "@/lib/site";

export const dynamic = "force-static";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Trang quản trị: không có gì để index, và không nên xuất hiện
      // trong kết quả tìm kiếm. Đây là dọn dẹp, không phải biện pháp bảo mật —
      // phần bảo vệ thật nằm ở mật khẩu trong Worker.
      disallow: ["/admin"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
