/**
 * Worker đứng trước site tĩnh.
 *
 * Site vẫn là `output: "export"` — mọi trang vẫn được build sẵn. Worker chỉ làm
 * hai việc: phục vụ API cho trang /admin, và áp metadata (ẩn / ghim / thứ tự)
 * lấy từ KV lên HTML đã build, để đổi metadata KHÔNG cần build lại.
 *
 * Chỉ những đường dẫn khai trong `assets.run_worker_first` mới đi qua đây;
 * phần còn lại đi thẳng tới Asset Worker.
 */

export interface PostMeta {
  hidden: boolean;
  pinned: boolean;
  /** Số càng nhỏ càng lên trên. Bài không có thứ tự riêng giữ nguyên vị trí build. */
  order: number | null;
}

export type PostMetaMap = Record<string, PostMeta>;

interface Env {
  ASSETS: Fetcher;
  POST_META: KVNamespace;
  /** Mật khẩu admin. Đặt bằng `wrangler secret put ADMIN_PASSWORD`. */
  ADMIN_PASSWORD?: string;
  /** Khoá ký cookie phiên. Đặt bằng `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET?: string;
}

const META_KEY = "post-meta";
const COOKIE = "pkmm_admin";
const SESSION_HOURS = 12;

// ---------------------------------------------------------------- phiên đăng nhập

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** So sánh không phụ thuộc thời gian — tránh rò rỉ qua việc đo thời gian phản hồi. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function makeSession(secret: string): Promise<string> {
  const expires = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  return `${expires}.${await hmac(secret, expires)}`;
}

async function validSession(secret: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, await hmac(secret, expires))) return false;
  const ts = Number(expires);
  return Number.isFinite(ts) && ts > Date.now();
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

// ---------------------------------------------------------------- metadata

async function readMeta(env: Env): Promise<PostMetaMap> {
  const raw = await env.POST_META.get(META_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PostMetaMap;
  } catch {
    return {}; // KV hỏng thì coi như chưa cấu hình gì, KHÔNG chặn cả site
  }
}

function isHidden(meta: PostMetaMap, slug: string): boolean {
  return meta[slug]?.hidden === true;
}

/** Slug của bài từ /blog/<slug>. */
function slugOf(pathname: string): string | null {
  const m = pathname.match(/^\/blog\/([^/]+?)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ---------------------------------------------------------------- API admin

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const password = env.ADMIN_PASSWORD;
  const secret = env.SESSION_SECRET;
  if (!password || !secret) {
    return json(
      { error: "Chưa cấu hình ADMIN_PASSWORD / SESSION_SECRET trên Worker." },
      503,
    );
  }

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    if (typeof body.password !== "string" || !safeEqual(body.password, password)) {
      // Cùng một thông báo cho mọi thất bại: không tiết lộ mật khẩu dài bao nhiêu.
      return json({ error: "Sai mật khẩu." }, 401);
    }
    const token = await makeSession(secret);
    return json(
      { ok: true },
      200,
      {
        "set-cookie":
          `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; ` +
          `Max-Age=${SESSION_HOURS * 3600}`,
      },
    );
  }

  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    return json({ ok: true }, 200, {
      "set-cookie": `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    });
  }

  // Mọi route còn lại đều cần phiên hợp lệ.
  if (!(await validSession(secret, readCookie(request, COOKIE)))) {
    return json({ error: "Chưa đăng nhập." }, 401);
  }

  if (url.pathname === "/api/admin/meta" && request.method === "GET") {
    return json({ meta: await readMeta(env) });
  }

  if (url.pathname === "/api/admin/meta" && request.method === "PUT") {
    const body = (await request.json().catch(() => null)) as { meta?: unknown } | null;
    if (!body || typeof body.meta !== "object" || body.meta === null) {
      return json({ error: "Thiếu trường `meta`." }, 400);
    }
    // Chuẩn hoá: chỉ ghi đúng ba trường mình hiểu, bỏ mọi thứ khác.
    const clean: PostMetaMap = {};
    for (const [slug, v] of Object.entries(body.meta as Record<string, unknown>)) {
      if (typeof slug !== "string" || slug.length > 200) continue;
      const m = (v ?? {}) as Record<string, unknown>;
      clean[slug] = {
        hidden: m.hidden === true,
        pinned: m.pinned === true,
        order: typeof m.order === "number" && Number.isFinite(m.order) ? m.order : null,
      };
    }
    await env.POST_META.put(META_KEY, JSON.stringify(clean));
    return json({ ok: true, meta: clean });
  }

  return json({ error: "Không có route này." }, 404);
}

// ---------------------------------------------------------------- áp lên HTML

/** Bỏ thẻ bài bị ẩn và phát CSS `order` cho phần ghim / đổi thứ tự. */
class BlogListRewriter {
  private orderCss = "";

  constructor(
    private meta: PostMetaMap,
    private visibleOrder: string[],
  ) {
    const rules: string[] = [];
    this.visibleOrder.forEach((slug, i) => {
      rules.push(`.blog-list [data-post-slug="${cssEscape(slug)}"]{order:${i}}`);
    });
    // Thẻ đứng đầu theo THỨ TỰ NHÌN THẤY phải gỡ đường kẻ trên; CSS
    // `:first-child` bám theo thứ tự DOM nên không dùng được ở đây.
    const first = this.visibleOrder[0];
    if (first) {
      rules.push(
        `.blog-list [data-post-slug="${cssEscape(first)}"]{border-top:none;padding-top:0}`,
      );
    }
    this.orderCss = rules.join("");
  }

  element(el: Element) {
    const slug = el.getAttribute("data-post-slug");
    if (slug && isHidden(this.meta, slug)) el.remove();
  }

  css(): string {
    return this.orderCss;
  }
}

/** Escape cho selector CSS: slug do mình đặt, nhưng vẫn không tin dữ liệu vào. */
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, "\\$&");
}

/**
 * Thứ tự hiển thị: bài ghim lên trước (theo `order` rồi tới thứ tự gốc),
 * sau đó tới phần còn lại. Bài bị ẩn không nằm trong danh sách.
 */
function computeOrder(slugs: string[], meta: PostMetaMap): string[] {
  const visible = slugs.filter((s) => !isHidden(meta, s));
  const rank = (s: string) => {
    const m = meta[s];
    const pin = m?.pinned ? 0 : 1;
    const ord = m?.order ?? Number.MAX_SAFE_INTEGER;
    return { pin, ord, idx: slugs.indexOf(s) };
  };
  return visible.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra.pin - rb.pin || ra.ord - rb.ord || ra.idx - rb.idx;
  });
}

async function transformHtml(res: Response, env: Env): Promise<Response> {
  const meta = await readMeta(env);
  if (Object.keys(meta).length === 0) return res; // không cấu hình gì -> trả nguyên bản

  // Cần biết thứ tự gốc của các thẻ: đọc trước bằng một bản sao.
  const html = await res.clone().text();
  const slugs = [...html.matchAll(/data-post-slug="([^"]+)"/g)].map((m) => m[1]);
  if (slugs.length === 0) return res;

  const rewriter = new BlogListRewriter(meta, computeOrder(slugs, meta));
  const css = rewriter.css();
  const hiddenList = [...new Set(slugs.filter((s) => isHidden(meta, s)))];

  return new HTMLRewriter()
    .on("[data-post-slug]", rewriter)
    .on("head", {
      element(el: Element) {
        if (css) el.append(`<style>${css}</style>`, { html: true });
        // React hydrate lại danh sách bài từ bundle JS và sẽ CHÈN LẠI thẻ vừa gỡ
        // nếu client không biết bài nào đang ẩn. Danh sách phải nằm trong <head>
        // để chắc chắn chạy trước script của Next.
        if (hiddenList.length > 0) {
          el.append(
            `<script>window.__PKMM_HIDDEN__=${JSON.stringify(hiddenList)}</script>`,
            { html: true },
          );
        }
      },
    })
    .transform(res);
}

/** Bỏ <item>/<url> của bài bị ẩn khỏi RSS và sitemap. */
async function filterFeed(res: Response, env: Env, tag: "item" | "url"): Promise<Response> {
  const meta = await readMeta(env);
  const hidden = Object.entries(meta)
    .filter(([, m]) => m.hidden)
    .map(([slug]) => slug);
  if (hidden.length === 0) return res;

  const body = await res.text();
  const re = new RegExp(`\\s*<${tag}>[\\s\\S]*?</${tag}>`, "g");
  const kept = body.replace(re, (block) =>
    hidden.some((slug) => block.includes(`/blog/${slug}`)) ? "" : block,
  );
  return new Response(kept, { status: res.status, headers: res.headers });
}

// ---------------------------------------------------------------- entry

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Domain chính đã chuyển sang phamkhanhminhman.com. pkmm.online và
    // www.<domain> vẫn được gắn Custom Domain (xem wrangler.jsonc) để link
    // cũ không chết, nhưng mọi request trên các host đó chuyển vĩnh viễn
    // (301) về apex mới — giữ đúng MỘT địa chỉ chính cho Google index,
    // tránh bị tính là nội dung trùng lặp giữa nhiều domain.
    const CANONICAL_HOST = "phamkhanhminhman.com";
    if (url.hostname !== CANONICAL_HOST || url.protocol !== "https:") {
      // Ép cả protocol lẫn hostname trong CÙNG một bước nhảy: Google Search
      // Console (Change of address) kiểm tra "chuyển hướng 301 từ trang chủ"
      // bằng cách gọi thẳng http://pkmm.online/ và đòi nhận về đúng 1 bước
      // 301 tới domain mới. Trước đây chỉ đổi hostname nên một request
      // http:// sẽ nhảy sang http://phamkhanhminhman.com/ (vẫn sai giao
      // thức) — Cloudflare "Always Use HTTPS" ở cấp zone đã chen thêm một
      // bước http→https TRƯỚC KHI request tới được Worker này, tạo thành
      // chuỗi 2 bước mà công cụ của Google không theo hết.
      url.protocol = "https:";
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      return handleApi(request, env, url);
    }

    // Site từng song ngữ; bản tiếng Việt đã gỡ. Những URL /vi/* đã được index
    // nên chuyển vĩnh viễn về bản tiếng Anh tương ứng thay vì trả 404 hàng loạt.
    if (url.pathname === "/vi" || url.pathname.startsWith("/vi/")) {
      const rest = url.pathname.slice(3) || "/";
      return Response.redirect(`${url.origin}${rest}${url.search}`, 301);
    }

    // Bài bị ẩn: trả đúng trang 404 của site, không phải một trang trắng.
    const slug = slugOf(url.pathname);
    if (slug && isHidden(await readMeta(env), slug)) {
      const notFound = await env.ASSETS.fetch(new URL("/404.html", url.origin));
      return new Response(notFound.body, { status: 404, headers: notFound.headers });
    }

    const res = await env.ASSETS.fetch(request);

    if (url.pathname === "/rss.xml") return filterFeed(res, env, "item");
    if (url.pathname === "/sitemap.xml") return filterFeed(res, env, "url");

    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return transformHtml(res, env);

    return res;
  },
} satisfies ExportedHandler<Env>;
