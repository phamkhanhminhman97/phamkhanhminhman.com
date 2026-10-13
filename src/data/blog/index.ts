import type { BlogPost } from "./types";

import refreshTokenRotationMeasured from "./posts/refresh-token-rotation-measured";
import nodejsWorkerThreadsMeasured from "./posts/nodejs-worker-threads-measured";
import postgresqlIndexNotesMeasured from "./posts/postgresql-index-notes-measured";
import optimisticVsPessimisticLocking from "./posts/optimistic-vs-pessimistic-locking";
import postgresqlIsolationLevelsMeasured from "./posts/postgresql-isolation-levels-measured";
import doubleCountingInAppendOnlyProjections from "./posts/double-counting-in-append-only-projections";
import silentMissingAwaitRunInExecutor from "./posts/silent-missing-await-run-in-executor";
import shopeeOauthTokenLifecycleAtScale from "./posts/shopee-oauth-token-lifecycle-at-scale";
import safeWebhookHandling from "./posts/safe-webhook-handling";
import ecommerceSdkMonorepo from "./posts/ecommerce-sdk-monorepo";
import theGeometryBehindVectorSearch from "./posts/the-geometry-behind-vector-search";

export type { BlogPost } from "./types";

/**
 * Toàn bộ bài viết (cả technical blog và study notes).
 * Thứ tự ở đây là thứ tự hiển thị mặc định (mới nhất trước) khi chưa có
 * `order` riêng đặt qua trang /admin.
 */
export const allPosts: BlogPost[] = [
  theGeometryBehindVectorSearch,
  refreshTokenRotationMeasured,
  nodejsWorkerThreadsMeasured,
  postgresqlIndexNotesMeasured,
  postgresqlIsolationLevelsMeasured,
  optimisticVsPessimisticLocking,
  doubleCountingInAppendOnlyProjections,
  silentMissingAwaitRunInExecutor,
  shopeeOauthTokenLifecycleAtScale,
  safeWebhookHandling,
  ecommerceSdkMonorepo,
];

/** Bài viết thuộc mục Technical Blog (/blog) - đo lường production, e-commerce backend. */
export const blogPosts: BlogPost[] = allPosts.filter((post) => post.section !== "notes");

/** Ghi chú học tập thuộc mục Study Notes (/notes) - đúc kết lý thuyết, toán, AI syllabus. */
export const notesPosts: BlogPost[] = allPosts.filter((post) => post.section === "notes");

