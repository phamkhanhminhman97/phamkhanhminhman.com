import React from "react";

// ─── Package / Project interfaces ───────────────────────────────────────────

export interface NpmPackageInfo {
  id: string;
  name: string;
  npmName: string;
  tag: string;
  description: string;
  longDescription: string;
  features: string[];
  githubUrl: string;
  npmUrl: string;
  docsUrl: string;
  defaultDownloads: number;
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
    tag: "API Client • v1.0.8",
    description:
      "TypeScript client for Shopee Open API v2. Covers seller authorization, token management, orders, products, logistics, and payment escrow.",
    longDescription:
      "shopee-api-client là thư viện TypeScript kết nối Shopee Open API v2. Hỗ trợ đầy đủ luồng OAuth: tạo link authorization, đổi code lấy access token, tự động refresh token. Bao gồm các API đơn hàng (getOrders, getOrderDetail, cancelOrder), sản phẩm (getCategory, getAttributes, getBrandList, updatePrice, updateStock), vận chuyển (shipOrder, getTrackingNumber, createShippingDocument, massShipOrder), thanh toán (getEscrowDetail), và xác thực webhook push notification từ Shopee.",
    features: [
      "OAuth 2.0: generateAuthLink, fetchTokenWithAuthCode, fetchTokenWithRefreshToken",
      "Orders: getOrders (auto-pagination), getOrderList, getOrderDetail, cancelOrder, searchPackageList",
      "Products: getCategory, getAttributes, getBrandList, addItem, updatePrice, updateStock, unListItem",
      "Logistics: shipOrder, getChannelList, getTrackingNumber, createShippingDocument, massShipOrder",
      "Payment: getEscrowDetail (tra soát thanh toán)",
      "Webhook Push: verifyShopeePushSignature, parseShopeePushPayload, createShopeePushSignature",
      "Full TypeScript với DTOs request/response được định nghĩa đầy đủ",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-api-client",
    npmUrl: "https://www.npmjs.com/package/shopee-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-api-client#readme",
    defaultDownloads: 1240,
    icon: (
      <picture>
        <source srcSet="/assets/shopee-logo.webp" type="image/webp" />
        <img
          src="/assets/shopee-logo.png"
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
        title: "Khởi tạo & Cấu hình",
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
        title: "Lấy danh sách đơn hàng",
        language: "typescript",
        code: `// Lấy đơn hàng trong 60 phút qua (auto-pagination)
const recentOrders = await shopee.getOrders(60);

// Hoặc với bộ lọc chi tiết:
const pendingOrders = await shopee.getOrders({
  beforeMinutes: 120,
  orderStatus: "READY_TO_SHIP",
  timeRangeField: "update_time",
  pageSize: 50,
});

console.log(\`Có \${pendingOrders.length} đơn đang chờ giao\`);`,
      },
      {
        title: "Xác thực Webhook Push",
        language: "typescript",
        code: `import { verifyShopeePushSignature } from "shopee-api-client";

// Xác thực signature từ Shopee Push Notification
const isValid = verifyShopeePushSignature(
  process.env.SHOPEE_PARTNER_KEY!,
  "raw-push-body",
  "x-shopee-signature-value"
);

if (isValid) {
  // Xử lý đơn hàng từ push notification
  console.log("Webhook hợp lệ, tiến hành xử lý...");
} else {
  console.warn("Signature không khớp, bỏ qua request");
}`,
      },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok Shop API Client",
    npmName: "tiktokshops-api-client",
    tag: "API Client • v1.0.6",
    description:
      "TypeScript API client for TikTok Shop Open API. Hỗ trợ seller authorization, order APIs, product APIs, và fulfillment APIs.",
    longDescription:
      "tiktokshops-api-client là thư viện TypeScript kết nối TikTok Shop Open API. Hỗ trợ cả API v1 và v2, bao gồm: xác thực seller OAuth, quản lý đơn hàng (getOrderList, getOrderDetail, getPriceDetail), sản phẩm (getProductDetail, getCategories, getBrands, getAttributes, createProduct), fulfillment (shipPackage, getPackageTimeSlots, getPackageShippingDocument), và logistic APIs. Thư viện sử dụng crypto-js để ký request signature theo chuẩn bảo mật TikTok Shop.",
    features: [
      "OAuth: generateAuthLink, fetchTokenWithAuthCode, refreshToken, getAuthorizedShop",
      "Orders (v2): getOrderList, getOrderDetail, getPriceDetail",
      "Products (v2): getProductDetail, getCategories, getBrands, getAttributes, createProduct",
      "Fulfillment (v2): shipPackage, getPackageTimeSlots, getPackageShippingDocument",
      "API v1 (legacy): order và product APIs",
      "Cấu hình: appKey, appSecret, serviceId, shopId, shopCipher, accessToken, refreshToken",
      "Hỗ trợ US Domain cho Partner Center Mỹ",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/tiktokshops-api-client",
    npmUrl: "https://www.npmjs.com/package/tiktokshops-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/tiktokshops-api-client#readme",
    defaultDownloads: 890,
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
        title: "Khởi tạo Client",
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
        title: "Lấy danh sách đơn hàng",
        language: "typescript",
        code: `// Lấy đơn hàng trong 24 giờ qua
const orders = await tiktok.getOrderList({
  beforeHours: 24,
  pageSize: 20,
  sortField: "create_time",
  sortOrder: "ASC",
});

console.log(orders);

// Lấy chi tiết một đơn
const detail = await tiktok.getOrderDetail("ORDER_NUMBER");
console.log(detail);`,
      },
      {
        title: "Tạo sản phẩm mới",
        language: "typescript",
        code: `import { TiktokModule } from "tiktokshops-api-client";

const tiktok = new TiktokModule({ /* config */ });

// Lấy danh mục và thuộc tính
const categories = await tiktok.getCategories();
const attributes = await tiktok.getAttributes(categoryId);

// Tạo sản phẩm
const newProduct = await tiktok.createProduct({
  product_name: "Tên sản phẩm",
  category_id: "CATEGORY_ID",
  description: "Mô tả sản phẩm...",
  // ... các trường khác
});`,
      },
    ],
  },
  {
    id: "lazada",
    name: "Lazada API Client",
    npmName: "lazada-api-client",
    tag: "API Client • v1.0.6",
    description:
      "TypeScript API client for Lazada Open API. Hỗ trợ seller authorization, order APIs, và product APIs.",
    longDescription:
      "lazada-api-client là thư viện TypeScript kết nối Lazada Open API. Hỗ trợ đa quốc gia (sg, my, th, vn, id, ph, cb). Bao gồm xác thực seller OAuth (generateAuthLink, fetchTokenWithAuthCode, refreshToken), quản lý đơn hàng (getOrdersBeforeSomeDay, getOrderDetail), và quản lý sản phẩm (getProducts, getProductItem, updateSellableQuantity, updateStatusProduct, updatePrice, getCategoryTree, getBrandByPages, createProduct). Thư viện tự động ký chữ ký theo chuẩn Lazada API signature.",
    features: [
      "OAuth: generateAuthLink, fetchTokenWithAuthCode, refreshToken",
      "Orders: getOrdersBeforeSomeDay, getOrderDetail",
      "Products: getProducts, getProductItem, updateSellableQuantity, updateStatusProduct, updatePrice",
      "Danh mục & Thương hiệu: getCategoryTree, getBrandByPages, createProduct",
      "Đa quốc gia: sg, my, th, vn, id, ph, cb",
      "Tự động ký chữ ký SHA256 theo chuẩn Lazada",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/lazada-api-client",
    npmUrl: "https://www.npmjs.com/package/lazada-api-client",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/lazada-api-client#readme",
    defaultDownloads: 620,
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
        title: "Khởi tạo & Cấu hình",
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
        title: "Quản lý sản phẩm",
        language: "typescript",
        code: `// Lấy danh sách sản phẩm
const products = await lazada.getProducts();
console.log(products);

// Cập nhật số lượng có thể bán
await lazada.updateSellableQuantity(123456, {
  sku_id: "SKU001",
  seller_sku: "PRODUCT-SKU",
  sellable_quantity: 100,
});

// Cập nhật trạng thái sản phẩm
await lazada.updateStatusProduct(123456, {
  status: "active", // hoặc "inactive"
});`,
      },
    ],
  },
  {
    id: "all-in-one",
    name: "All-in-One Package",
    npmName: "shopee-tiktokshops-lazada-api",
    tag: "Monorepo • v4.3.16",
    description:
      "Package hợp nhất cả ba SDK Shopee, TikTok Shop và Lazada trong một dependency duy nhất. Tự động đồng bộ phiên bản.",
    longDescription:
      "shopee-tiktokshops-lazada-api là package wrapper tích hợp sẵn cả ba thư viện shopee-api-client, tiktokshops-api-client và lazada-api-client. Thay vì phải cài đặt từng package riêng lẻ và quản lý nhiều phiên bản, bạn chỉ cần một lệnh npm install là có thể sử dụng đồng thời cả ba nền tảng thương mại điện tử. Package này re-export tất cả các module, class, type, và DTOs từ cả ba package con, giúp đơn giản hóa quản lý dependency cho các hệ thống multi-channel e-commerce.",
    features: [
      "Re-export ShopeeModule, TiktokModule, LazadaModule từ một package duy nhất",
      "Tự động đồng bộ phiên bản với các package con qua monorepo scripts",
      "Giảm thiểu conflict dependency khi dùng nhiều SDK",
      "Phù hợp cho multi-channel e-commerce system",
      "Hỗ trợ TypeScript đầy đủ với tất cả DTOs",
      "Dễ dàng nâng cấp: chạy sync-all-in-one-deps để cập nhật",
    ],
    githubUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-tiktok-lazada-api",
    npmUrl: "https://www.npmjs.com/package/shopee-tiktokshops-lazada-api",
    docsUrl:
      "https://github.com/phamkhanhminhman97/shopee-tiktok-lazada-monorepo/tree/main/packages/shopee-tiktok-lazada-api#readme",
    defaultDownloads: 340,
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
        title: "Sử dụng All-in-One",
        language: "typescript",
        code: `import {
  ShopeeModule,
  TiktokModule,
  LazadaModule,
} from "shopee-tiktokshops-lazada-api";

// Khởi tạo tất cả clients từ một package duy nhất
const shopee = new ShopeeModule({ /* Shopee config */ });
const tiktok = new TiktokModule({ /* TikTok config */ });
const lazada = new LazadaModule({ /* Lazada config */ });

// Đồng bộ đơn hàng từ tất cả các sàn
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
