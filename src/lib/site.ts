/** Một nguồn sự thật cho URL site — dùng ở metadata, sitemap, robots, JSON-LD.
   Đổi từ pkmm.online sang phamkhanhminhman.com — domain cũ vẫn trỏ vào cùng
   Worker (xem wrangler.jsonc), chỉ đổi ở đây để canonical link/OG/sitemap
   trỏ đúng về tên miền chính, tránh Google thấy nội dung trùng ở hai domain. */
export const SITE_URL = "https://phamkhanhminhman.com";
