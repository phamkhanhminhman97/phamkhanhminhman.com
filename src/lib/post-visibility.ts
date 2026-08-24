declare global {
  interface Window {
    /** Danh sách slug đang ẩn, do Worker chèn vào <head> trước khi React hydrate. */
    __PKMM_HIDDEN__?: string[];
  }
}

/**
 * Slug của các bài đang bị ẩn.
 *
 * Worker gỡ thẻ bài khỏi HTML, nhưng dữ liệu bài nằm trong bundle JS nên React
 * hydrate xong sẽ chèn lại — đã đo được đúng như vậy. Vì thế client phải đọc
 * cùng một danh sách để render ra kết quả GIỐNG HTML mà Worker trả về.
 *
 * Lúc build không có `window`: trả về mảng rỗng, HTML build ra đủ mọi bài, rồi
 * Worker mới gỡ. Nếu Worker không chạy (ví dụ mở thẳng file tĩnh) thì cả hai phía
 * đều không ẩn gì — vẫn khớp nhau.
 */
export function hiddenSlugs(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.__PKMM_HIDDEN__;
  return Array.isArray(raw) ? raw : [];
}
