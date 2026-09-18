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
      "TypeScript client for Shopee Open API v2. Covers seller authorization, token management, orders, products, logistics, and payment escrow.",
    longDescription:
      "shopee-api-client is a TypeScript library for Shopee Open API v2. It handles the whole OAuth flow: building the authorization link, exchanging the code for an access token, and refreshing the token before it expires. It covers order APIs (getOrders, getOrderDetail, cancelOrder), products (getCategory, getAttributes, getBrandList, updatePrice, updateStock), logistics (shipOrder, getTrackingNumber, createShippingDocument, massShipOrder), payment (getEscrowDetail), and signature checking for Shopee push notification webhooks.",
    features: [
      "OAuth 2.0: generateAuthLink, fetchTokenWithAuthCode, fetchTokenWithRefreshToken",
      "Orders: getOrders (auto-pagination), getOrderList, getOrderDetail, cancelOrder, searchPackageList",
      "Products: getCategory, getAttributes, getBrandList, addItem, updatePrice, updateStock, unListItem",
      "Logistics: shipOrder, getChannelList, getTrackingNumber, createShippingDocument, massShipOrder",
      "Payment: getEscrowDetail (payment reconciliation)",
      "Webhook Push: verifyShopeePushSignature, parseShopeePushPayload, createShopeePushSignature",
      "Typed end to end, with request/response DTOs for every call",
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
    ],
  },
  {
    id: "tiktok",
    name: "TikTok Shop API Client",
    npmName: "tiktokshops-api-client",
    tag: "API Client",
    description:
      "TypeScript API client for TikTok Shop Open API. Covers seller authorization, order APIs, product APIs, and fulfillment APIs.",
    longDescription:
      "tiktokshops-api-client is a TypeScript library for TikTok Shop Open API. It speaks both v1 and v2 and covers seller OAuth, orders (getOrderList, getOrderDetail, getPriceDetail), products (getProductDetail, getCategories, getBrands, getAttributes, createProduct), fulfillment (shipPackage, getPackageTimeSlots, getPackageShippingDocument), and the logistic APIs. Request signing uses crypto-js and follows the signature scheme TikTok Shop expects.",
    features: [
      "OAuth: generateAuthLink, fetchTokenWithAuthCode, refreshToken, getAuthorizedShop",
      "Orders (v2): getOrderList, getOrderDetail, getPriceDetail",
      "Products (v2): getProductDetail, getCategories, getBrands, getAttributes, createProduct",
      "Fulfillment (v2): shipPackage, getPackageTimeSlots, getPackageShippingDocument",
      "API v1 (legacy): order and product APIs",
      "Config: appKey, appSecret, serviceId, shopId, shopCipher, accessToken, refreshToken",
      "US domain support for the US Partner Center",
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
    ],
  },
  {
    id: "lazada",
    name: "Lazada API Client",
    npmName: "lazada-api-client",
    tag: "API Client",
    description:
      "TypeScript API client for Lazada Open API. Covers seller authorization, order APIs, and product APIs.",
    longDescription:
      "lazada-api-client is a TypeScript library for Lazada Open API, and works against every Lazada region (sg, my, th, vn, id, ph, cb). It covers seller OAuth (generateAuthLink, fetchTokenWithAuthCode, refreshToken), orders (getOrdersBeforeSomeDay, getOrderDetail), and products (getProducts, getProductItem, updateSellableQuantity, updateStatusProduct, updatePrice, getCategoryTree, getBrandByPages, createProduct). Every request is signed for you following the Lazada API signature scheme.",
    features: [
      "OAuth: generateAuthLink, fetchTokenWithAuthCode, refreshToken",
      "Orders: getOrdersBeforeSomeDay, getOrderDetail",
      "Products: getProducts, getProductItem, updateSellableQuantity, updateStatusProduct, updatePrice",
      "Categories & brands: getCategoryTree, getBrandByPages, createProduct",
      "Regions: sg, my, th, vn, id, ph, cb",
      "SHA256 request signing handled for you, per the Lazada spec",
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
  countryCode: "sg", // sg, my, th, vn, id, ph, cb
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
