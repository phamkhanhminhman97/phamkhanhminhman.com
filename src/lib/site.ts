/** Một nguồn sự thật cho URL site — dùng ở metadata, sitemap, robots, JSON-LD.
   Đổi từ pkmm.online sang phamkhanhminhman.com — domain cũ vẫn trỏ vào cùng
   Worker (xem wrangler.jsonc), chỉ đổi ở đây để canonical link/OG/sitemap
   trỏ đúng về tên miền chính, tránh Google thấy nội dung trùng ở hai domain. */
export const SITE_URL = "https://phamkhanhminhman.com";

/**
 * Tên miền ở dạng chữ hiển thị, không có scheme.
 *
 * Dùng cho breadcrumb, nhãn trang quản trị, tiêu đề email liên hệ — những chỗ
 * in tên miền ra cho người đọc chứ không phải để bấm vào. Trước đây năm chỗ
 * như vậy tự gõ tay "pkmm.online", nên đổi tên miền là phải đi sửa từng chỗ và
 * đã sót thật: breadcrumb blog và projects vẫn hiện tên miền cũ sau khi đã
 * chuyển xong. Có hằng số này thì lần sau đổi đúng một dòng.
 */
export const SITE_DOMAIN = "phamkhanhminhman.com";
