import type { BlogPost } from "./types";

import theGeometryBehindVectorSearch from "./posts/the-geometry-behind-vector-search";

/**
 * Ghi chú học tập của mục /notes — đúc kết từ syllabus Cao học, không phải bài
 * đo lường production. Chỉ route /notes/* import file này (xem ghi chú ở
 * `./index.ts` về lý do tách).
 *
 * Thứ tự: mới nhất trước.
 */
export const notesPosts: BlogPost[] = [theGeometryBehindVectorSearch];
