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
  /** Nhật ký lượt truy cập — xem migrations/0001_visits.sql. */
  DB: D1Database;
  /** Mật khẩu admin. Đặt bằng `wrangler secret put ADMIN_PASSWORD`. */
  ADMIN_PASSWORD?: string;
  /** Khoá ký cookie phiên. Đặt bằng `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET?: string;
  /**
   * Bộ đếm chặn dò mật khẩu cho /api/admin/login — xem `ratelimits` trong
   * wrangler.jsonc. Để optional vì binding này chỉ tồn tại sau khi deploy:
   * thiếu nó thì đăng nhập vẫn chạy, chỉ là không được chặn.
   */
  LOGIN_LIMIT?: RateLimit;
}

const META_KEY = "post-meta";
const COOKIE = "pkmm_admin";
const SESSION_HOURS = 12;

/** Giữ nhật ký bao nhiêu ngày. Quá mốc này thì tự xoá — xem `sweep()`. */
const VISIT_RETENTION_DAYS = 90;

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

/**
 * Header bảo mật cho những response ĐI QUA Worker.
 *
 * File tĩnh không qua đây (xem `run_worker_first`) nên chúng được phủ bằng
 * `public/_headers`. Hai chỗ cố ý giữ cùng một bộ giá trị: nếu chỉ đặt ở một
 * nơi thì tuỳ đường dẫn mà trang có hoặc không có bảo vệ, rất khó nhận ra.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

/** Gắn bộ header trên vào một response đã có, giữ nguyên body và status. */
function withSecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

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

// ---------------------------------------------------------------- nhật ký lượt xem

/**
 * Nhận diện máy quét. Không nhằm chặn ai — chỉ để trang quản trị mặc định
 * hiện người thật, vì Googlebot/UptimeRobot quét đều đặn sẽ lấp hết danh sách.
 * Cờ này ghi kèm mỗi hàng nên vẫn xem lại được bot khi cần.
 */
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|curl|wget|python-requests|headless|lighthouse|semrush|ahrefs|dataprovider|scrapy|go-http|java\/|okhttp|axios|node-fetch|libwww|httpclient|got \(|guzzle|postman|insomnia|zgrab|masscan|nmap/i;

/**
 * Chuỗi nhận dạng TỰ MÂU THUẪN — dấu hiệu giả mạo chắc chắn nhất.
 *
 * Một máy quét thật sự bắt được nhờ chỗ này: nó khai
 * `"AppleWebKit/534.54 ... Chrome/90.0.5"` — WebKit 534 là bản năm 2011 (đi
 * cùng Chrome 12–15), còn Chrome 90 là năm 2021. Hai con số cách nhau mười
 * năm nên không thể cùng tồn tại. Chrome thật dùng `WebKit/537.36` cố định từ
 * 2013 tới giờ, và số hiệu luôn có bốn phần (`90.0.4430.212`) chứ không phải
 * ba (`90.0.5`).
 *
 * Người viết máy quét ghép chuỗi từ nhiều mảnh rời nên hay để lộ kiểu này,
 * trong khi trình duyệt thật không bao giờ sai chính tả về chính nó.
 */
function fakeUA(ua: string): boolean {
  const chrome = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (chrome) {
    const webkit = ua.match(/AppleWebKit\/(\d+)\.(\d+)/);
    // Chrome từ bản 28 (2013) trở đi luôn đi kèm WebKit 537.36.
    if (webkit && Number(chrome[1]) >= 28 && Number(webkit[1]) < 537) return true;
    // Thiếu số thứ tư: Chrome thật luôn có đủ bốn phần.
    if (!chrome[4] && Number(chrome[1]) >= 20) return true;
  }
  // Khai là Safari trên máy tính nhưng thiếu "Version/" — Safari thật luôn có.
  if (/Safari\//.test(ua) && /Macintosh/.test(ua) && !/Version\/|Chrome|CriOS|Edg/.test(ua)) {
    return true;
  }
  return false;
}

/** Cắt chuỗi trước khi ghi: một User-Agent giả mạo có thể dài vài KB. */
const cut = (s: string | null | undefined, n: number) => (s ?? "").slice(0, n);

/**
 * Trình duyệt nhúng trong ứng dụng khác.
 *
 * Với một trang cá nhân hay được gửi qua tin nhắn thì đây là nhóm đáng kể, mà
 * chuỗi nhận dạng của chúng trông gần y hệt Safari/Chrome thường — chỉ khác
 * một mẩu ở cuối. Biết được thì mới hiểu vì sao có lượt "mở rồi thoát ngay":
 * người ta bấm link trong Messenger, liếc một cái rồi quay lại chat.
 */
function webviewOf(ua: string): string {
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/Zalo/i.test(ua)) return "Zalo";
  if (/Line\//i.test(ua)) return "LINE";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  if (/TikTok|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/Twitter/i.test(ua)) return "X";
  if (/Telegram/i.test(ua)) return "Telegram";
  // Android WebView: có "wv" trong chuỗi. iOS thì không có dấu hiệu nào chắc
  // chắn nếu ứng dụng không tự thêm, nên chỉ nhận diện được các tên ở trên.
  if (/; wv\)/i.test(ua)) return "Ứng dụng";
  return "";
}

/** Số, đã chặn trên chặn dưới — dữ liệu từ trình duyệt là dữ liệu KHÔNG tin được. */
function num(v: unknown, max: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
}

/**
 * Nhà mạng là hạ tầng máy chủ thuê, không phải mạng dân dụng.
 *
 * Người thật vào từ Viettel, VNPT, FPT, hoặc mạng của công ty. Một lượt truy
 * cập đến từ trung tâm dữ liệu gần như chắc chắn là máy — trừ vài trường hợp
 * hiếm như người dùng VPN doanh nghiệp. Nên đây là tín hiệu để NGHI NGỜ, cộng
 * với các dấu hiệu khác, chứ không tự nó kết luận.
 */
const HOSTING_ASN =
  /amazon|aws|google cloud|microsoft|azure|digitalocean|linode|vultr|hetzner|ovh|contabo|scaleway|ucloud|alibaba|tencent|oracle cloud|cloudflare|leaseweb|choopa|datacamp|m247|colocrossing|hostinger|godaddy|namecheap|servers|hosting|datacenter|data center/i;

/**
 * Ghi một lượt truy cập.
 *
 * Luôn gọi qua `ctx.waitUntil` — người xem không phải chờ D1 ghi xong mới thấy
 * trang, và nếu D1 lỗi (hết hạn mức, mạng chập) thì trang vẫn hiện bình
 * thường: nhật ký là thứ phụ, không được phép làm hỏng site.
 *
 * `vid` là mã của lượt tải trang này, do chỗ gọi sinh ra và nhúng vào HTML để
 * lát nữa trình duyệt báo ngược lại (xem `handleBeacon`).
 */
async function logVisit(request: Request, env: Env, url: URL, vid: string): Promise<void> {
  // `cf-connecting-ip` là IP thật của người xem do chính Cloudflare gắn vào ở
  // biên; không thể bị giả mạo từ phía client như `x-forwarded-for`.
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  const cf = (request.cf ?? {}) as IncomingRequestCfProperties;

  // Cloudflare tự xác minh được Googlebot/Bingbot thật (đối chiếu ngược DNS),
  // khác hẳn với việc tin vào chuỗi User-Agent tự khai.
  const bv = (cf as { botManagement?: { verifiedBot?: boolean } }).botManagement;
  const verifiedBot = bv?.verifiedBot ? "cloudflare" : "";

  // Gộp mọi dấu hiệu lại. Từ khoá trong chuỗi chỉ bắt được máy quét TỰ KHAI;
  // `fakeUA` bắt loại cố giả trình duyệt nhưng ghép chuỗi sai; nhà mạng máy chủ
  // là tín hiệu bổ sung. Trình duyệt thật sẽ gỡ cờ này khi script chạy được
  // và có tương tác (xem `handleBeacon`), nên nhận nhầm cũng tự sửa được.
  const asn = cut(cf.asOrganization as string | undefined, 96);
  const looksBot =
    BOT_UA.test(ua) || !ua || Boolean(verifiedBot) || fakeUA(ua) || HOSTING_ASN.test(asn);

  await env.DB.prepare(
    `INSERT INTO visits
       (ts, ip, country, city, region, asn, path, referer, ua, bot,
        vid, lat, lon, postal, tz, colo, proto, tls, rtt, verified_bot, lang,
        webview)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      Date.now(),
      cut(ip, 64),
      cut(cf.country as string | undefined, 8),
      cut(cf.city as string | undefined, 64),
      cut(cf.region as string | undefined, 64),
      asn,
      cut(url.pathname, 200),
      cut(request.headers.get("referer"), 200),
      cut(ua, 300),
      looksBot ? 1 : 0,
      vid,
      cut(cf.latitude as string | undefined, 24),
      cut(cf.longitude as string | undefined, 24),
      cut(cf.postalCode as string | undefined, 24),
      cut(cf.timezone as string | undefined, 48),
      cut(cf.colo as string | undefined, 8),
      cut(cf.httpProtocol as string | undefined, 16),
      cut(cf.tlsVersion as string | undefined, 16),
      num((cf as { clientTcpRtt?: number }).clientTcpRtt, 100000),
      verifiedBot,
      cut(request.headers.get("accept-language"), 64),
      webviewOf(ua),
    )
    .run();
}

/**
 * Dọn hàng quá hạn. Chạy xác suất ~1/200 lượt xem thay vì đặt Cron Trigger:
 * một trang cá nhân vài chục lượt/ngày thì vẫn chạm tới đủ thường xuyên, mà
 * không phải nuôi thêm một handler `scheduled` chỉ để xoá vài hàng.
 */
async function sweep(env: Env): Promise<void> {
  if (Math.random() > 0.005) return;
  const cutoff = Date.now() - VISIT_RETENTION_DAYS * 86400_000;
  await env.DB.prepare("DELETE FROM visits WHERE ts < ?").bind(cutoff).run();
}

/** Gói cả hai việc trên vào một promise nuốt lỗi, để chỗ gọi khỏi lặp try/catch. */
function recordVisit(request: Request, env: Env, url: URL, vid: string): Promise<void> {
  return (async () => {
    try {
      await logVisit(request, env, url, vid);
      await sweep(env);
    } catch {
      // Nhật ký hỏng thì im lặng bỏ qua — không đáng để làm hỏng một lượt xem.
    }
  })();
}

/**
 * Trình duyệt báo về sau khi trang đã mở.
 *
 * Đây là phần trả lời câu "có phải người thật không" một cách đáng tin. Cờ bot
 * dựa trên chuỗi User-Agent chỉ bắt được máy quét TỰ KHAI báo mình là máy;
 * loại chép nguyên chuỗi của Chrome thì lọt hết. Còn ở đây, để một hàng lên
 * được `human = 2` thì phía kia phải chạy được JavaScript, có màn hình thật,
 * VÀ có người cuộn hoặc bấm — ba thứ mà máy quét thông thường không làm.
 *
 * KHÔNG cần đăng nhập (người xem lạ mới là đối tượng ghi), nên mọi trường đều
 * bị chặn độ dài và ép kiểu; và chỉ `UPDATE` đúng hàng có `vid` khớp, không bao
 * giờ `INSERT` — người ngoài không tự tạo được hàng giả.
 */
async function handleBeacon(request: Request, env: Env): Promise<Response> {
  const ok = new Response(null, { status: 204 });
  try {
    const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const vid = typeof b?.vid === "string" ? b.vid.slice(0, 36) : "";
    // `vid` do Worker sinh ra bằng crypto.randomUUID rồi nhúng vào HTML; không
    // đúng dạng thì không phải báo cáo thật. UUID v4 dài đúng 36 ký tự — chặn
    // ở 32 như trước là loại sạch mọi báo cáo hợp lệ mà không báo lỗi gì.
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(vid)) return ok;

    const stage = num(b?.human, 2);
    await env.DB.prepare(
      `UPDATE visits SET
           cid = CASE WHEN ? != '' THEN ? ELSE cid END,
           -- Chỉ đi LÊN: một lượt đã chứng minh có tương tác thì báo cáo sau
           -- đó (gửi lúc đóng tab) không được kéo nó tụt về "chỉ mới tải".
           human = MAX(human, ?),
           dwell = MAX(dwell, ?),
           scroll = MAX(scroll, ?),
           screen = CASE WHEN ? != '' THEN ? ELSE screen END,
           tz_client = CASE WHEN ? != '' THEN ? ELSE tz_client END,
           gpu = CASE WHEN ? != '' THEN ? ELSE gpu END,
           cpu = MAX(cpu, ?),
           ram = MAX(ram, ?),
           touch = MAX(touch, ?),
           model = CASE WHEN ? != '' THEN ? ELSE model END,
           os_version = CASE WHEN ? != '' THEN ? ELSE os_version END,
           net = CASE WHEN ? != '' THEN ? ELSE net END,
           downlink = MAX(downlink, ?),
           rtt_client = MAX(rtt_client, ?),
           -- Script chạy được thì gần như chắc chắn không phải máy quét, kể
           -- cả khi chuỗi User-Agent trông giống bot.
           bot = CASE WHEN ? >= 2 THEN 0 ELSE bot END
         WHERE vid = ?`,
    )
      .bind(
        cut(b?.cid as string, 32), cut(b?.cid as string, 32),
        stage,
        num(b?.dwell, 86400),
        num(b?.scroll, 100),
        cut(b?.screen as string, 32), cut(b?.screen as string, 32),
        cut(b?.tz as string, 48), cut(b?.tz as string, 48),
        cut(b?.gpu as string, 96), cut(b?.gpu as string, 96),
        num(b?.cpu, 256),
        num(b?.ram, 1024),
        b?.touch ? 1 : 0,
        cut(b?.model as string, 48), cut(b?.model as string, 48),
        cut(b?.osv as string, 24), cut(b?.osv as string, 24),
        cut(b?.net as string, 12), cut(b?.net as string, 12),
        num(b?.downlink, 100000),
        num(b?.rttc, 100000),
        stage,
        vid,
      )
      .run();
  } catch {
    // Báo cáo hỏng thì thôi — không bao giờ để nó ảnh hưởng tới người đang xem.
  }
  return ok;
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
    // Chặn dò mật khẩu TRƯỚC khi đọc body.
    //
    // Vì sao cần: endpoint này công khai, và `safeEqual` chỉ chống đo thời
    // gian chứ không chống thử nhiều lần. Không có giới hạn thì một script
    // đơn giản cứ thế gửi liên tục cho tới khi trúng — trang quản trị chỉ có
    // đúng một mật khẩu đứng giữa.
    //
    // Đếm theo IP thật do Cloudflare gắn ở biên (không giả mạo được từ client).
    // Vượt ngưỡng trả 429 chứ không phải 401: người gõ nhầm biết là mình đang
    // bị chặn tạm thời, không phải mật khẩu sai.
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const allowed = env.LOGIN_LIMIT ? (await env.LOGIN_LIMIT.limit({ key: ip })).success : true;
    if (!allowed) {
      return json({ error: "Thử quá nhiều lần. Đợi một phút rồi thử lại." }, 429, {
        "retry-after": "60",
      });
    }

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

  if (url.pathname === "/api/admin/visits" && request.method === "GET") {
    return handleVisits(env, url);
  }

  // Đánh dấu / bỏ đánh dấu máy của mình.
  if (url.pathname === "/api/admin/own" && request.method === "POST") {
    const b = (await request.json().catch(() => null)) as {
      cid?: string;
      label?: string;
      remove?: boolean;
    } | null;
    const cid = cut(b?.cid, 32);
    if (!cid) return json({ error: "Thiếu mã máy." }, 400);
    if (b?.remove) {
      await env.DB.prepare("DELETE FROM own_devices WHERE cid = ?").bind(cid).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO own_devices (cid, label, added_at) VALUES (?, ?, ?)
         ON CONFLICT(cid) DO UPDATE SET label = excluded.label`,
      )
        .bind(cid, cut(b?.label, 48), Date.now())
        .run();
    }
    return json({ ok: true });
  }

  return json({ error: "Không có route này." }, 404);
}

// ---------------------------------------------------------------- API nhật ký

async function handleVisits(env: Env, url: URL): Promise<Response> {
  const daysRaw = Number(url.searchParams.get("days") ?? 7);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 7;
  const since = Date.now() - days * 86400_000;
  // Mặc định giấu bot: Googlebot và các máy quét uptime ghé đều đặn, để lẫn
  // vào thì danh sách "ai đã xem" gần như chỉ toàn máy.
  const bots = url.searchParams.get("bots") === "1";
  const botFilter = bots ? "" : " AND bot = 0";
  // Lọc "chỉ người thật": đã chứng minh bằng tương tác, không phải bằng
  // chuỗi User-Agent tự khai.
  const humanOnly = url.searchParams.get("human") === "1" ? " AND human >= 2" : "";
  // Ẩn máy của chính mình, trừ khi hỏi ngược lại. Dùng NOT EXISTS thay vì JOIN
  // để câu truy vấn không đổi hình dạng khi bảng own_devices còn rỗng.
  const mine = url.searchParams.get("mine") === "1";
  const ownFilter = mine
    ? ""
    : " AND (cid = '' OR NOT EXISTS (SELECT 1 FROM own_devices o WHERE o.cid = visits.cid))";
  const where = botFilter + humanOnly + ownFilter;

  try {
    // Ba câu truy vấn cho ba khối trên màn hình. Chạy song song vì chúng độc
    // lập nhau — D1 tính theo số hàng đọc chứ không theo số câu lệnh, nên
    // tách ra không đắt hơn gộp.
    const [people, recent, totals, own] = await Promise.all([
      // Gộp theo MÁY (`cid` trong localStorage) nếu có, không thì theo IP. Vì
      // sao: IP di động đổi liên tục nên gộp theo IP sẽ xé một người thành
      // nhiều dòng. `cid` chỉ có khi script chạy được, nên hai cách vẫn phải
      // dùng song song.
      env.DB.prepare(
        `SELECT CASE WHEN cid != '' THEN cid ELSE ip END AS who,
                MAX(cid)         AS cid,
                MAX(ip)          AS ip,
                COUNT(DISTINCT ip) AS ips,
                COUNT(*)         AS hits,
                MAX(ts)          AS last_ts,
                MIN(ts)          AS first_ts,
                MAX(country)     AS country,
                MAX(city)        AS city,
                MAX(region)      AS region,
                MAX(asn)         AS asn,
                MAX(ua)          AS ua,
                MAX(human)       AS human,
                MAX(dwell)       AS dwell,
                MAX(scroll)      AS scroll,
                SUM(dwell)       AS total_dwell,
                MAX(screen)      AS screen,
                MAX(gpu)         AS gpu,
                MAX(model)       AS model,
                MAX(os_version)  AS os_version,
                MAX(cpu)         AS cpu,
                MAX(ram)         AS ram,
                MAX(touch)       AS touch,
                MAX(lat)         AS lat,
                MAX(lon)         AS lon,
                MAX(postal)      AS postal,
                MAX(tz)          AS tz,
                MAX(tz_client)   AS tz_client,
                MAX(colo)        AS colo,
                MAX(proto)       AS proto,
                MAX(tls)         AS tls,
                MAX(rtt)         AS rtt,
                MAX(lang)        AS lang,
                MAX(net)         AS net,
                MAX(downlink)    AS downlink,
                MAX(rtt_client)  AS rtt_client,
                MAX(webview)     AS webview,
                MAX(verified_bot) AS verified_bot,
                MAX(referer)     AS referer,
                COUNT(DISTINCT path) AS pages
           FROM visits
          WHERE ts >= ?${where}
       GROUP BY who
       ORDER BY last_ts DESC
          LIMIT 300`,
      )
        .bind(since)
        .all(),
      // Dòng thời gian thô, để soi đúng một phiên xem cụ thể.
      env.DB.prepare(
        `SELECT ts, ip, cid, country, city, region, asn, path, referer, ua, bot,
                human, dwell, scroll, screen, gpu, model, os_version, cpu, ram,
                touch, lat, lon, tz, tz_client, colo, proto, tls, rtt, lang,
                net, downlink, rtt_client, webview, verified_bot
            FROM visits
          WHERE ts >= ?${where}
       ORDER BY ts DESC
          LIMIT 500`,
      )
        .bind(since)
        .all(),
      env.DB.prepare(
        `SELECT COUNT(*) AS hits,
                COUNT(DISTINCT ip) AS visitors,
                SUM(bot) AS bot_hits,
                SUM(CASE WHEN human >= 2 THEN 1 ELSE 0 END) AS human_hits,
                COUNT(DISTINCT CASE WHEN human >= 2 THEN COALESCE(NULLIF(cid,''), ip) END) AS humans
           FROM visits
          WHERE ts >= ?${ownFilter}`,
      )
        .bind(since)
        .first(),
      env.DB.prepare("SELECT cid, label FROM own_devices").all(),
    ]);

    return json({
      days,
      people: people.results ?? [],
      recent: recent.results ?? [],
      totals: totals ?? { hits: 0, visitors: 0, bot_hits: 0, human_hits: 0, humans: 0 },
      own: (own.results ?? []) as { cid: string; label: string }[],
    });
  } catch (err) {
    // Trường hợp thật hay gặp: đã deploy Worker nhưng quên chạy migration, nên
    // bảng `visits` chưa tồn tại. Nói thẳng ra thay vì trả 500 trống trơn.
    const msg = err instanceof Error ? err.message : String(err);
    if (/no such table/i.test(msg)) {
      return json(
        { error: "Chưa có bảng `visits`. Chạy: npx wrangler d1 migrations apply phamkhanhminhman --remote" },
        503,
      );
    }
    return json({ error: `Lỗi đọc nhật ký: ${msg}` }, 500);
  }
}

// ---------------------------------------------------------------- áp lên HTML

/**
 * Đoạn script nhúng vào mỗi trang để trình duyệt tự khai thông tin máy và báo
 * lại có người thật hay không.
 *
 * Viết tay, nén sẵn, chưa tới 1KB và chạy sau khi trang đã hiện — cố ý không
 * kéo thêm thư viện phân tích nào: một trang tĩnh nhẹ mà nhét vào 40KB script
 * đo đạc thì hỏng mất cái nhanh vốn có.
 *
 * Ba mốc gửi báo cáo:
 *   1 — ngay khi tải xong: chứng minh JavaScript chạy được, kèm thông tin máy.
 *   2 — khi có cuộn/bấm/ở lại quá 15 giây: chứng minh có người thật.
 *   cuối — lúc rời trang: chốt lại ở lại bao lâu, đọc tới đâu.
 */
function beaconScript(vid: string): string {
  return `(function(){try{
var V=${JSON.stringify(vid)},S=0,T=Date.now(),H=1,sent=0;
var C=localStorage.getItem('_pk');if(!C){C=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem('_pk',C)}catch(e){}}
function gpu(){try{var c=document.createElement('canvas'),g=c.getContext('webgl')||c.getContext('experimental-webgl');if(!g)return'';var d=g.getExtension('WEBGL_debug_renderer_info');return d?String(g.getParameter(d.UNMASKED_RENDERER_WEBGL)).slice(0,96):''}catch(e){return''}}
function send(h,extra){if(sent>2&&h<2)return;sent++;var n=navigator.connection||{};
var b={vid:V,cid:C,human:h,dwell:Math.round((Date.now()-T)/1000),scroll:S,screen:screen.width+'x'+screen.height+'@'+(devicePixelRatio||1),tz:(Intl.DateTimeFormat().resolvedOptions().timeZone||''),gpu:gpu(),cpu:navigator.hardwareConcurrency||0,ram:navigator.deviceMemory||0,touch:(navigator.maxTouchPoints||0)>0?1:0,model:(extra&&extra.model)||'',osv:(extra&&extra.osv)||'',net:n.effectiveType||'',downlink:Math.round((n.downlink||0)*10),rttc:n.rtt||0};
// Đo độ trễ thật từ chính lượt tải trang này, không phụ thuộc navigator.connection
// (Safari không có API đó). PerformanceNavigationTiming có sẵn ở mọi trình duyệt.
try{var p=performance.getEntriesByType('navigation')[0];if(p&&p.responseStart&&p.requestStart){var m=Math.round(p.responseStart-p.requestStart);if(m>0&&(!b.rttc||m<b.rttc))b.rttc=m}}catch(e){}
var s=JSON.stringify(b);if(navigator.sendBeacon){navigator.sendBeacon('/api/pulse',new Blob([s],{type:'application/json'}))}else{fetch('/api/pulse',{method:'POST',body:s,keepalive:true})}}
function first(){var u=navigator.userAgentData;if(u&&u.getHighEntropyValues){u.getHighEntropyValues(['model','platformVersion']).then(function(v){send(1,{model:v.model||'',osv:v.platformVersion||''})}).catch(function(){send(1)})}else{send(1)}}
addEventListener('scroll',function(){var d=document.documentElement,m=d.scrollHeight-innerHeight;if(m>0){var p=Math.round(scrollY/m*100);if(p>S)S=p}H=2},{passive:true});
addEventListener('click',function(){H=2},{passive:true});
addEventListener('keydown',function(){H=2});
addEventListener('pointermove',function(){H=2},{passive:true,once:true});
setTimeout(function(){if(H<2&&Date.now()-T>=15000)H=2;if(H>1)send(2)},15000);
addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')send(H)});
addEventListener('pagehide',function(){send(H)});
if(document.readyState==='complete')first();else addEventListener('load',first);
}catch(e){}})();`;
}

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

/**
 * Chèn script đo lượt xem, và áp metadata bài viết nếu có.
 *
 * Trước đây hàm này trả nguyên bản ngay khi chưa có metadata nào. Giờ script
 * đo phải được nhúng vào MỌI trang HTML, nên lối thoát sớm đó chuyển thành
 * "bỏ qua phần metadata", chứ không bỏ qua cả lượt biến đổi.
 */
async function transformHtml(
  res: Response,
  env: Env,
  vid: string,
  track: boolean,
): Promise<Response> {
  const meta = await readMeta(env);

  let rewriter: BlogListRewriter | null = null;
  let css = "";
  let hiddenList: string[] = [];

  if (Object.keys(meta).length > 0) {
    // Cần biết thứ tự gốc của các thẻ: đọc trước bằng một bản sao.
    const html = await res.clone().text();
    const slugs = [...html.matchAll(/data-post-slug="([^"]+)"/g)].map((m) => m[1]);
    if (slugs.length > 0) {
      rewriter = new BlogListRewriter(meta, computeOrder(slugs, meta));
      css = rewriter.css();
      hiddenList = [...new Set(slugs.filter((s) => isHidden(meta, s)))];
    }
  }

  if (!rewriter && !track) return res;

  let out = new HTMLRewriter().on("head", {
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
  });

  if (rewriter) out = out.on("[data-post-slug]", rewriter);

  if (track) {
    // Đặt cuối <body>, không phải <head>: script chỉ đo đạc, không được phép
    // chen vào đường tải của nội dung.
    out = out.on("body", {
      element(el: Element) {
        el.append(`<script>${beaconScript(vid)}</script>`, { html: true });
      },
    });
  }

  return out.transform(res);
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Bọc một lớp ngoài cùng để MỌI nhánh trả về đều có header bảo mật —
    // gắn ở từng `return` thì chỉ cần thêm một nhánh mới là sót.
    return withSecurityHeaders(await handle(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

  // Trình duyệt báo về sau khi trang đã mở. Đặt trước phần ghi nhật ký để
  // chính lượt gọi này không bị đếm thành một lượt xem.
  if (url.pathname === "/api/pulse" && request.method === "POST") {
    return handleBeacon(request, env);
  }

  // Ghi nhật ký SAU khối chuyển hướng và khối /api/admin ở trên: lượt bị
  // 301 sang domain chính sẽ được ghi lại ở request kế tiếp (trên đúng
  // domain), nên ghi cả hai chỉ tạo ra hàng đôi. Còn các lượt gọi API của
  // chính trang quản trị thì không phải là người xem site.
  //
  // `waitUntil` giữ Worker sống để hoàn tất việc ghi SAU KHI response đã
  // gửi đi — người xem không chờ thêm mili-giây nào.
  //
  // `vid` nối hàng vừa ghi với báo cáo mà trình duyệt gửi về lát nữa.
  const vid = crypto.randomUUID();
  ctx.waitUntil(recordVisit(request, env, url, vid));

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
  if (type.includes("text/html")) {
    // Không đo trang quản trị: đó là mình tự xem, đếm vào chỉ làm nhiễu.
    const track = !url.pathname.startsWith("/admin");
    return transformHtml(res, env, vid, track);
  }

  return res;
}
