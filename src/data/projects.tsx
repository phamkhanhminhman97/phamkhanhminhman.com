import React from "react";

// ─── Package / Project interfaces ───────────────────────────────────────────

export interface NpmPackageInfo {
  id: string;
  name: string;
  npmName: string;
  /**
   * Nhãn loại gói — KHÔNG chứa số phiên bản.
   *
   * Trước đây trường này là "API Client • v1.0.8": số version gõ tay, nằm
   * trong mã nguồn, và mỗi lần publish lên npm là nó sai thêm một bậc mà
   * không có gì nhắc. Đã đo: site hiện v1.0.8 trong khi npm ở 2.3.0.
   * Phiên bản giờ lấy từ registry lúc chạy (xem `lib/npm-stats.ts`).
   */
  tag: string;
  description: string;
  longDescription: string;
  features: string[];
  githubUrl: string;
  npmUrl: string;
  docsUrl: string;
  icon: React.ReactNode;
  /** Code examples to display on the detail page */
  codeExamples: CodeExample[];
}

export interface CodeExample {
  title: string;
  language: string;
  code: string;
}

// ─── NPM Package Dataset ────────────────────────────────────────────────────
// Data sourced from the actual monorepo source code at:
// packages/shopee-api-client, packages/tiktokshops-api-client, packages/lazada-api-client

export const npmPackages: NpmPackageInfo[] = [
  {
    id: "shopee",
    name: "Shopee API Client",
    npmName: "shopee-api-client",
    tag: "API Client",
    description:
      "TypeScript client for Shopee Open API v2: 446 endpoints across 30 API domains, with typed errors, timeouts and safe retries.",
    longDescription:
      "shopee-api-client is a TypeScript library for Shopee Open API v2, covering all 30 domains of the reference shopee-sdk (446 endpoints). It handles the whole OAuth flow, signs every request, and verifies push-notification webhooks. The six core domains (orders, products, logistics, payment, returns, push) are flat methods on ShopeeModule; the other domains live under typed namespaces such as shopee.ads and shopee.voucher, so no new method collides with an existing name. Every failure surfaces as a ShopeeApiError, every call has a 30-second timeout, and GET requests retry transient errors while POST never does. 147 unit tests.",
    features: [
      "446 endpoints across 30 domains: orders, products, logistics, payment, returns, ads, vouchers, livestream, global products and more",
      "Namespaced domains (shopee.ads.*, shopee.voucher.*, shopee.globalProduct.*) keep 20 new domains clear of existing method names",
      "Errors: every failure throws a ShopeeApiError with code, request ID, HTTP status and the raw response",
      "Reliability: 30s timeout on every call; GET retries 408/429/5xx with exponential backoff, jitter and Retry-After; POST is never retried, so an order is never shipped or cancelled twice",
      "OAuth: generateAuthLink, fetchTokenWithAuthCode, fetchTokenWithRefreshToken",
      "Webhooks: verifyShopeePushSignature, parseShopeePushPayload",
      "File uploads sent as real multipart/form-data (5 upload endpoints fixed in v2.3.0)",
      "No any in the public API; 147 unit tests",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-api-client",
    npmUrl: "https://www.npmjs.com/package/shopee-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-api-client#readme",
    icon: (
      <picture>
        <source srcSet="/assets/shopee-logo.webp" type="image/webp" />
        <img
          src="/assets/shopee-logo.jpg"
          alt="Shopee"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="w-6 h-6 object-contain"
        />
      </picture>
    ),
    codeExamples: [
      {
        title: "Setup & configuration",
        language: "typescript",
        code: `import { ShopeeModule } from "shopee-api-client";

const shopee = new ShopeeModule({
  partnerId: Number(process.env.SHOPEE_PARTNER_ID),
  partnerKey: process.env.SHOPEE_PARTNER_KEY!,
  shopId: process.env.SHOPEE_SHOP_ID,
  accessToken: process.env.SHOPEE_ACCESS_TOKEN,
  refreshToken: process.env.SHOPEE_REFRESH_TOKEN,
});`,
      },
      {
        title: "Fetching orders",
        language: "typescript",
        code: `// Orders from the last 60 minutes (auto-pagination)
const recentOrders = await shopee.getOrders(60);

// Or with a narrower filter:
const pendingOrders = await shopee.getOrders({
  beforeMinutes: 120,
  orderStatus: "READY_TO_SHIP",
  timeRangeField: "update_time",
  pageSize: 50,
});

console.log(\`\${pendingOrders.length} orders waiting to ship\`);`,
      },
      {
        title: "Verifying a push webhook",
        language: "typescript",
        code: `import { verifyShopeePushSignature } from "shopee-api-client";

// Check the signature on a Shopee push notification
const isValid = verifyShopeePushSignature(
  process.env.SHOPEE_PARTNER_KEY!,
  "raw-push-body",
  "x-shopee-signature-value"
);

if (isValid) {
  // Process the order carried by the push notification
  console.log("Signature checks out, processing...");
} else {
  console.warn("Signature mismatch, dropping the request");
}`,
      },
      {
        title: "Namespaced domains and typed errors",
        language: "typescript",
        code: `import { ShopeeApiError } from "shopee-api-client";

try {
  // Newer domains live under their own namespace
  const vouchers = await shopee.voucher.getVoucherList({
    status: "ongoing", // upcoming | ongoing | expired | all
    page_size: 50,
  });
  console.log(vouchers);
} catch (err) {
  if (err instanceof ShopeeApiError) {
    // Shopee's error code, request ID and HTTP status, ready for logs
    console.error(err.code, err.requestId, err.status);
  }
  throw err;
}`,
      },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok Shop API Client",
    npmName: "tiktokshops-api-client",
    tag: "API Client",
    description:
      "TypeScript client for TikTok Shop Open API: 155 endpoints across 14 domains, request signing included, typed errors.",
    longDescription:
      "tiktokshops-api-client is a TypeScript library for TikTok Shop Open API, covering all 14 domains of the reference tiktok-shop-sdk (155 endpoints): orders, products, fulfillment, logistics, finance, promotions, returns and refunds, affiliate, analytics and more. It implements TikTok's HMAC-SHA256 request signing, including the shop_cipher parameter and the separate signing rule for multipart uploads. The domains live under typed namespaces (tiktok.finance, tiktok.order, …) next to the original flat methods, so existing code keeps working. Failures throw a TiktokApiError, and every call has a 30-second timeout.",
    features: [
      "155 endpoints across 14 domains: order, product, fulfillment, logistics, finance, promotion, return/refund, affiliate, analytics, seller, shop and more",
      "Namespaced domains (tiktok.finance.*, tiktok.order.*) sit next to the original flat methods without breaking them",
      "HMAC-SHA256 request signing, with shop_cipher and the multipart signing rule handled for you",
      "Errors: failures throw a TiktokApiError with code, request ID and HTTP status; 30s timeout on every call",
      "Product image and file uploads over multipart/form-data",
      "OAuth: generateAuthLink (US Partner Center supported), fetchTokenWithAuthCode, refreshToken, getAuthorizedShop",
      "No any in the public API; every endpoint checked against the reference SDK, 17 unit tests",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/tiktokshops-api-client",
    npmUrl: "https://www.npmjs.com/package/tiktokshops-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/tiktokshops-api-client#readme",
    icon: (
      <picture>
        <source srcSet="/assets/tiktokshops-logo.webp" type="image/webp" />
        <img
          src="/assets/tiktokshops-logo.png"
          alt="TikTok Shop"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="w-6 h-6 object-contain"
        />
      </picture>
    ),
    codeExamples: [
      {
        title: "Creating the client",
        language: "typescript",
        code: `import { TiktokModule } from "tiktokshops-api-client";

const tiktok = new TiktokModule({
  appKey: process.env.TIKTOK_APP_KEY!,
  appSecret: process.env.TIKTOK_APP_SECRET!,
  serviceId: process.env.TIKTOK_SERVICE_ID!,
  shopId: process.env.TIKTOK_SHOP_ID!,
  shopCipher: process.env.TIKTOK_SHOP_CIPHER!,
  accessToken: process.env.TIKTOK_ACCESS_TOKEN!,
  refreshToken: process.env.TIKTOK_REFRESH_TOKEN!,
});`,
      },
      {
        title: "Fetching orders",
        language: "typescript",
        code: `// Orders from the last 24 hours
const orders = await tiktok.getOrderList({
  beforeHours: 24,
  pageSize: 20,
  sortField: "create_time",
  sortOrder: "ASC",
});

console.log(orders);

// Detail for a single order
const detail = await tiktok.getOrderDetail("ORDER_NUMBER");
console.log(detail);`,
      },
      {
        title: "Creating a product",
        language: "typescript",
        code: `import { TiktokModule } from "tiktokshops-api-client";

const tiktok = new TiktokModule({ /* config */ });

// Look up the category and its attributes
const categories = await tiktok.getCategories();
const attributes = await tiktok.getAttributes(categoryId);

// Create the product
const newProduct = await tiktok.createProduct({
  product_name: "Product name",
  category_id: "CATEGORY_ID",
  description: "Product description...",
  // ... remaining fields
});`,
      },
      {
        title: "Namespaced domains",
        language: "typescript",
        code: `import { TiktokApiError } from "tiktokshops-api-client";

try {
  // Finance: settlements and withdrawals from the last 7 days
  const withdrawals = await tiktok.finance.getWithdrawals({
    types: ["WITHDRAW", "SETTLE"],
    create_time_ge: Math.floor(Date.now() / 1000) - 7 * 24 * 3600,
    page_size: 50,
  });
  console.log(withdrawals.data);
} catch (err) {
  if (err instanceof TiktokApiError) {
    console.error(err.code, err.requestId, err.status);
  }
  throw err;
}`,
      },
    ],
  },
  {
    id: "lazada",
    name: "Lazada API Client",
    npmName: "lazada-api-client",
    tag: "API Client",
    description:
      "TypeScript client for Lazada Open API: 363 endpoints across 33 domains, routed to the right regional host.",
    longDescription:
      "lazada-api-client is a TypeScript library for Lazada Open API, covering the 33 domains of the Lazada OpenAPI specification (363 endpoints): orders, products, logistics, fulfillment, finance, returns and refunds, vouchers, sponsored solutions and more. Each request goes to the regional host for the configured country (sg, vn, ph, my, th, id) and is signed with HMAC-SHA256. POST payloads travel in a form-encoded body rather than the URL, so large requests no longer hit URL length limits. The domains live under typed namespaces (lazada.finance, lazada.order, …); failures throw a LazadaApiError, and every call has a 30-second timeout.",
    features: [
      "363 endpoints across 33 domains: orders, products, logistics, fulfillment, finance, returns, vouchers, sponsored solutions, IM and more",
      "Regional routing: requests go to the host for countryCode (sg, vn, ph, my, th, id); token calls use the auth host",
      "Namespaced domains (lazada.finance.*, lazada.order.*, lazada.fbl.*) sit next to the original flat methods",
      "Errors: any non-zero response code throws a LazadaApiError with code, type, request ID and HTTP status",
      "30s timeout on every call; POST payloads sent as a form-encoded body, not in the URL",
      "Orders: getOrders (one page) and getAllOrders (auto-pagination), plus pack, ready-to-ship and AWB printing",
      "HMAC-SHA256 request signing handled for you; no any in the public API; 18 unit tests",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/lazada-api-client",
    npmUrl: "https://www.npmjs.com/package/lazada-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/lazada-api-client#readme",
    icon: (
      <picture>
        <source srcSet="/assets/lazada-logo.webp" type="image/webp" />
        <img
          src="/assets/lazada-logo.png"
          alt="Lazada"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="w-6 h-6 object-contain"
        />
      </picture>
    ),
    codeExamples: [
      {
        title: "Setup & configuration",
        language: "typescript",
        code: `import { LazadaModule } from "lazada-api-client";

const lazada = new LazadaModule({
  appKey: process.env.LAZADA_APP_KEY!,
  appSecret: process.env.LAZADA_APP_SECRET!,
  appAccessToken: process.env.LAZADA_ACCESS_TOKEN!,
  refreshToken: process.env.LAZADA_REFRESH_TOKEN!,
  countryCode: "sg", // sg, vn, ph, my, th, id
});`,
      },
      {
        title: "Managing products",
        language: "typescript",
        code: `// List products
const products = await lazada.getProducts();
console.log(products);

// Update sellable quantity
await lazada.updateSellableQuantity(123456, {
  sku_id: "SKU001",
  seller_sku: "PRODUCT-SKU",
  sellable_quantity: 100,
});

// Update product status
await lazada.updateStatusProduct(123456, {
  status: "active", // or "inactive"
});`,
      },
      {
        title: "Orders, namespaces and typed errors",
        language: "typescript",
        code: `import { LazadaApiError } from "lazada-api-client";

try {
  // Every order updated in the last 24 hours, all pages fetched for you
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const orders = await lazada.getAllOrders({ update_after: since });
  console.log(orders.length);

  // Newer domains live under their own namespace
  const payouts = await lazada.finance.getPayoutStatus({ created_after: since });
  console.log(payouts);
} catch (err) {
  if (err instanceof LazadaApiError) {
    console.error(err.code, err.type, err.requestId);
  }
  throw err;
}`,
      },
    ],
  },
  {
    id: "all-in-one",
    name: "All-in-One Package",
    npmName: "shopee-tiktokshops-lazada-api",
    tag: "Monorepo",
    description:
      "Bundles the Shopee, TikTok Shop and Lazada SDKs into a single dependency, with versions kept in sync automatically.",
    longDescription:
      "shopee-tiktokshops-lazada-api is a wrapper package that pulls in shopee-api-client, tiktokshops-api-client and lazada-api-client together. Instead of installing three packages and tracking three version numbers, one npm install gets you all three marketplaces. It re-exports every module, class, type and DTO from the three child packages, which keeps dependency management simpler in a multi-channel e-commerce system.",
    features: [
      "Re-exports ShopeeModule, TiktokModule and LazadaModule from one package",
      "Also re-exports every type and error class: ShopeeApiError, TiktokApiError, LazadaApiError",
      "Child package versions stay in sync via the monorepo scripts",
      "Fewer dependency conflicts than installing the three SDKs separately",
      "Meant for multi-channel e-commerce systems",
      "Fully typed, with all DTOs carried through",
      "Upgrading is one command: run sync-all-in-one-deps",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-tiktok-lazada-api",
    npmUrl: "https://www.npmjs.com/package/shopee-tiktokshops-lazada-api",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-tiktok-lazada-api#readme",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="w-6 h-6"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
    codeExamples: [
      {
        title: "Using the all-in-one package",
        language: "typescript",
        code: `import {
  ShopeeModule,
  TiktokModule,
  LazadaModule,
} from "shopee-tiktokshops-lazada-api";

// Every client comes from the same package
const shopee = new ShopeeModule({ /* Shopee config */ });
const tiktok = new TiktokModule({ /* TikTok config */ });
const lazada = new LazadaModule({ /* Lazada config */ });

// Pull orders from all three marketplaces at once
const [shopeeOrders, tiktokOrders, lazadaProducts] = await Promise.all([
  shopee.getOrders(60),
  tiktok.getOrderList({ beforeHours: 24, pageSize: 20 }),
  lazada.getProducts(),
]);

console.log({
  shopee: shopeeOrders.length,
  tiktok: tiktokOrders.data.orders.length,
  lazada: lazadaProducts.length,
});`,
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPackageById(id: string): NpmPackageInfo | undefined {
  return npmPackages.find((pkg) => pkg.id === id);
}

export function getPackageBySlug(slug: string): NpmPackageInfo | undefined {
  return npmPackages.find((pkg) => pkg.id === slug);
}

export function getRelatedPackages(
  currentId: string,
  limit: number = 3
): NpmPackageInfo[] {
  return npmPackages
    .filter((pkg) => pkg.id !== currentId)
    .slice(0, limit);
}

/** Map from the URL slug to the package slug used in the blog */
export function getBlogSlugForPackage(pkgId: string): string | undefined {
  const map: Record<string, string> = {
    shopee: "shopee-oauth-token-lifecycle-at-scale",
    tiktok: "safe-webhook-handling",
    lazada: "ecommerce-sdk-monorepo",
  };
  return map[pkgId];
}
