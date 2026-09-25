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

export type { BlogPost } from "./types";

/**
 * Thứ tự ở đây là thứ tự hiển thị mặc định (mới nhất trước) khi chưa có
 * `order` riêng đặt qua trang /admin. Mỗi bài sống trong file riêng dưới
 * `./posts/<slug>.tsx` — xem `./types.ts` cho hình dạng `BlogPost`.
 */
export const blogPosts: BlogPost[] = [
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
