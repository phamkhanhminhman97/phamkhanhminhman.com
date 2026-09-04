"use client";

import React from "react";
import { SITE_DOMAIN } from "@/lib/site";

/**
 * Nhật ký lượt truy cập.
 *
 * Tồn tại vì Cloudflare gói Free không cho xem IP: Instant Logs chỉ có từ gói
 * Business, Logpush từ Pro, còn Web Analytics thì cố ý không lưu IP. Worker tự
 * ghi vào D1 (bảng `visits`), trang này chỉ đọc lại qua `/api/admin/visits`.
 *
 * Giống trang quản trị bài viết: static export nên đây là HTML tĩnh + React ở
 * trình duyệt, mọi dữ liệu đi qua API có kiểm tra phiên đăng nhập.
 */

/** Thông tin máy + mạng, dùng chung cho cả hai cách nhìn. */
interface Device {
  ip: string;
  cid: string;
  country: string;
  city: string;
  region: string;
  asn: string;
  ua: string;
  human: number;
  dwell: number;
  scroll: number;
  screen: string;
  gpu: string;
  model: string;
  os_version: string;
  cpu: number;
  ram: number;
  touch: number;
  lat: string;
  lon: string;
  tz: string;
  tz_client: string;
  colo: string;
  proto: string;
  tls: string;
  rtt: number;
  lang: string;
  net: string;
  downlink: number;
  rtt_client: number;
  webview: string;
  verified_bot: string;
}

interface Person extends Device {
  who: string;
  ips: number;
  hits: number;
  last_ts: number;
  first_ts: number;
  total_dwell: number;
  postal: string;
  referer: string;
  pages: number;
}

interface Hit extends Device {
  ts: number;
  path: string;
  referer: string;
  bot: number;
}

interface Totals {
  hits: number;
  visitors: number;
  bot_hits: number;
  human_hits: number;
  humans: number;
}

const RANGES = [1, 7, 30, 90];

/** Cờ quốc gia từ mã ISO hai chữ: A → 🇦 bằng cách dời sang khối Regional Indicator. */
function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function when(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "vừa xong";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const clock = (ts: number) =>
  new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** Hệ điều hành, để ghép với tên trình duyệt. */
function osOf(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
}

/**
 * Một dòng mô tả máy, gộp mọi manh mối lại: "Safari 27 · iPhone 12/13/14".
 *
 * Đời máy suy từ độ phân giải chứ không từ chuỗi nhận dạng — trên iOS thì
 * chuỗi đó không nói tên máy, còn độ phân giải thì không nói dối được.
 */
function device(d: { ua: string; screen?: string; os_version?: string; gpu?: string }): string {
  if (!d.ua) return "—";
  const b = browserOf(d.ua);
  const v = osVersion(d.ua, d.os_version ?? "");
  const model = guessModel(d.screen ?? "", d.ua, d.gpu ?? "");
  const os = osName(d.ua);
  return [b, model || osOf(d.ua), v && os ? `${os} ${v}` : ""]
    .filter(Boolean)
    .join(" · ");
}

/** Nguồn dẫn tới, rút về tên miền cho dễ đọc. */
function source(referer: string): string {
  if (!referer) return "trực tiếp";
  try {
    return new URL(referer).hostname.replace(/^www\./, "");
  } catch {
    return referer.slice(0, 30);
  }
}

/**
 * Mức tin cậy "đây là người thật".
 *
 * Cột `human` do chính trình duyệt chứng minh: 2 nghĩa là đã có cuộn/bấm hoặc
 * ở lại đủ lâu, 1 nghĩa là JavaScript chạy được nhưng chưa thấy tương tác, 0
 * nghĩa là chỉ có một request trần — thứ mà `curl` hay máy quét cũng tạo ra được.
 */
function trust(d: {
  human: number;
  verified_bot: string;
  gpu: string;
  ua?: string;
  asn?: string;
  proto?: string;
}): {
  label: string;
  cls: string;
  why: string;
} {
  if (d.verified_bot)
    return {
      label: "Bot đã xác minh",
      cls: "bg-zinc-100 text-zinc-600 border-zinc-200",
      why: "Cloudflare đối chiếu ngược DNS và xác nhận đây là máy quét thật của Google/Bing.",
    };
  if (d.human >= 2)
    return {
      label: "Người thật",
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      why: "Đã cuộn trang, bấm chuột hoặc ở lại trên 15 giây — máy quét không làm những việc này.",
    };
  if (d.human === 1)
    return {
      label: "Trình duyệt thật",
      cls: "bg-sky-50 text-sky-800 border-sky-200",
      why: d.gpu
        ? "JavaScript chạy được và đọc ra được card đồ hoạ thật, nhưng chưa thấy tương tác."
        : "JavaScript chạy được nhưng chưa thấy tương tác — có thể mở rồi đóng ngay.",
    };

  // Chưa có tín hiệu trình duyệt: nói rõ VÌ SAO nghi ngờ, thay vì để người
  // đọc tự đoán. Các dấu hiệu này cộng dồn lại thì gần như chắc chắn là máy.
  const clues = botClues(d.ua ?? "", d.asn ?? "", d.proto ?? "");
  if (clues.length > 0)
    return {
      label: "Gần như chắc là máy",
      cls: "bg-red-50 text-red-800 border-red-200",
      why: `Không có tín hiệu trình duyệt nào, cộng thêm: ${clues.join("; ")}.`,
    };

  return {
    label: "Chưa rõ",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
    why: "Chỉ thấy một request trần, không có tín hiệu nào từ trình duyệt. Có thể là máy quét, công cụ xem trước link, hoặc người chặn JavaScript.",
  };
}

/**
 * Liệt kê dấu hiệu máy, bằng lời người đọc hiểu được.
 *
 * Viết ra thay vì chỉ trả về đúng/sai, vì "vì sao nghi ngờ" mới là thứ giúp
 * bạn tự phán đoán — nhất là khi hệ thống đoán sai.
 */
function botClues(ua: string, asn: string, proto: string): string[] {
  const out: string[] = [];

  const chrome = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (chrome) {
    const webkit = ua.match(/AppleWebKit\/(\d+)\./);
    if (webkit && Number(chrome[1]) >= 28 && Number(webkit[1]) < 537) {
      out.push(
        `chuỗi nhận dạng tự mâu thuẫn (WebKit ${webkit[1]} là bản ~2011 nhưng khai Chrome ${chrome[1]} của ~2021)`,
      );
    }
    if (!chrome[4] && Number(chrome[1]) >= 20) {
      out.push("số hiệu Chrome thiếu phần cuối (bản thật luôn có bốn số)");
    }
  }

  if (/^(Go-http|python|curl|wget|java|okhttp|axios|node-fetch|libwww|postman)/i.test(ua)) {
    out.push("tự khai là thư viện gọi HTTP, không phải trình duyệt");
  }

  if (
    /amazon|aws|google cloud|azure|digitalocean|linode|vultr|hetzner|ovh|ucloud|alibaba|tencent|leaseweb|m247|hosting|datacenter/i.test(
      asn,
    )
  ) {
    out.push("đến từ trung tâm dữ liệu thuê, không phải mạng dân dụng");
  }

  if (proto === "HTTP/1.1") {
    out.push("dùng HTTP/1.1 trong khi trình duyệt hiện nay đi HTTP/2 hoặc HTTP/3");
  }

  return out;
}

/** "2 phút 15 giây" dễ đọc hơn "135". */
function dur(sec: number): string {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}p${s}s` : `${m}p`;
}

/**
 * Đoán đời máy từ tên chip đồ hoạ. User-Agent hiện đại giấu tên máy (mọi
 * iPhone đều khai giống nhau), nhưng WebGL thì vẫn nói ra chip — và chip thì
 * gắn chặt với đời máy.
 *
 * Trên iOS gần như vô dụng: Safari trả về đúng chuỗi "Apple GPU" cho mọi máy
 * (đã kiểm chứng trên iPhone 12 chạy iOS 27). Chỗ nó thật sự có giá trị là
 * máy tính, nơi WebGL nói thẳng "RTX 4070" hay "Apple M3 Pro" — thứ mà độ
 * phân giải màn hình không suy ra được.
 */
function chip(gpu: string): string {
  if (!gpu) return "";
  const m = gpu.match(/Apple (A\d+|M\d+)/i);
  if (m) return `Apple ${m[1].toUpperCase()}`;
  const adreno = gpu.match(/Adreno[^)]*\)?\s*(\d+)/i);
  if (adreno) return `Adreno ${adreno[1]}`;
  const mali = gpu.match(/Mali-?(\w+)/i);
  if (mali) return `Mali ${mali[1]}`;
  const nv = gpu.match(/(RTX|GTX)\s*(\d+\s*\w*)/i);
  if (nv) return `${nv[1].toUpperCase()} ${nv[2]}`;
  return gpu.replace(/ANGLE \(|\)$/g, "").slice(0, 38);
}

/**
 * Đời máy suy từ độ phân giải màn hình.
 *
 * Trên iOS đây là cách DUY NHẤT còn dùng được: WebGL trả về "Apple GPU" cho
 * mọi máy, Client Hints thì Apple không hỗ trợ, còn chuỗi nhận dạng đã bị làm
 * mờ. Nhưng độ phân giải logic thì không nói dối được — nó là kích thước
 * thật của màn hình.
 *
 * Không phân biệt được các máy DÙNG CHUNG một cỡ màn (iPhone 12/13/14 giống
 * hệt nhau), nên trả về cả nhóm thay vì đoán bừa một cái tên.
 */
const SCREENS: Record<string, string> = {
  // iPhone
  "320x568@2": "iPhone SE (1)",
  "375x667@2": "iPhone 6/7/8/SE2/SE3",
  "414x736@3": "iPhone 6+/7+/8+",
  "375x812@3": "iPhone X/XS/11 Pro/12 mini/13 mini",
  "414x896@2": "iPhone XR/11",
  "414x896@3": "iPhone XS Max/11 Pro Max",
  "390x844@3": "iPhone 12/13/14",
  "428x926@3": "iPhone 12/13/14 Pro Max",
  "393x852@3": "iPhone 14 Pro/15/16",
  "430x932@3": "iPhone 14/15/16 Pro Max",
  "402x874@3": "iPhone 16 Pro",
  "440x956@3": "iPhone 16 Pro Max",
  // iPad
  "768x1024@2": "iPad",
  "810x1080@2": "iPad 10.2",
  "820x1180@2": "iPad Air",
  "834x1194@2": "iPad Pro 11",
  "1024x1366@2": "iPad Pro 12.9",
};

function guessModel(screen: string, ua: string, gpu = ""): string {
  // Máy tính: chip nói chính xác hơn màn hình nhiều. Một chiếc Mac có thể cắm
  // màn ngoài đủ kích cỡ, nhưng "Apple M4" thì chỉ có một nghĩa. Với PC cũng
  // vậy: "RTX 4070" nói được nhiều hơn "1920x1080".
  const chipName = macChip(gpu);
  if (chipName) return `Mac (${chipName})`;

  if (screen) {
    const hit = SCREENS[screen];
    if (hit) return hit;
  }

  // Không tra được: ít nhất nói đúng loại máy.
  const wh = screen ? screen.split("@")[0] : "";
  const suffix = wh ? ` (${wh})` : "";
  if (/iPhone/i.test(ua)) return `iPhone${suffix}`;
  if (/iPad/i.test(ua)) return `iPad${suffix}`;
  if (/Android/i.test(ua)) return `Android${suffix}`;
  if (/Macintosh|Mac OS/i.test(ua)) return `Mac${suffix}`;
  if (/Windows/i.test(ua)) return `Windows${suffix}`;
  if (/Linux/i.test(ua)) return `Linux${suffix}`;
  return "";
}

/** Chip Apple Silicon từ chuỗi WebGL: "…Apple M4, Unspecified…" → "M4". */
function macChip(gpu: string): string {
  const m = gpu.match(/Apple (M\d+(?:\s+(?:Pro|Max|Ultra))?)/i);
  return m ? m[1] : "";
}

/**
 * Phiên bản iOS/Android — phải đọc theo từng trình duyệt vì chúng nói dối
 * khác nhau. Trên CÙNG một chiếc iPhone 12 chạy iOS 27:
 *
 *   Chrome iOS: "CPU iPhone OS 27_0_0 ... CriOS/152"  → số ở "OS" ĐÚNG
 *   Safari iOS: "CPU iPhone OS 18_7 ... Version/27.0" → số ở "OS" SAI (đóng
 *                                                       băng), số đúng nằm ở
 *                                                       "Version/"
 *
 * Safari cố tình giữ "18_7" để không làm hỏng các trang cũ dò phiên bản, và
 * chuyển số thật sang "Version/". Đọc bằng một quy tắc chung là sai một trong
 * hai trường hợp.
 */
function osVersion(ua: string, reported: string): string {
  // Client Hints nói thì tin — đây là nguồn đáng tin nhất, và trên máy tính
  // là nguồn DUY NHẤT đúng: chuỗi nhận dạng của Mac đóng băng ở
  // "Mac OS X 10_15_7" từ năm 2020 và không bao giờ đổi nữa, dù máy đang
  // chạy macOS 27. Windows cũng vậy — Windows 11 vẫn khai "Windows NT 10.0".
  if (reported) return reported.replace(/(\.0)+$/, ""); // "27.0.0" → "27"
  const isSafari = /Version\/(\d+)/.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isSafari && /iPhone|iPad/i.test(ua)) {
    const v = ua.match(/Version\/(\d+(?:\.\d+)?)/);
    // Cắt ".0" thừa cho khớp với nhánh Client Hints ở trên: Safari khai
    // "Version/27.0" nhưng Chrome khai "27.0.0" → cả hai phải ra "27", không
    // thì cùng một máy lại hiện hai kiểu tuỳ trình duyệt.
    if (v) return v[1].replace(/(\.0)+$/, "");
  }
  const os = ua.match(/(?:iPhone )?OS (\d+)[._](\d+)/);
  // Bỏ qua "Mac OS X 10_15_7": con số này là hằng số, không phải phiên bản thật.
  if (os && !/Mac OS X 10[._]15/i.test(ua)) return `${os[1]}.${os[2]}`;
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return android[1];
  return "";
}

/** Tên hệ điều hành, để ghép với số phiên bản cho đủ nghĩa. */
function osName(ua: string): string {
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "";
}

/** Tên trình duyệt, phân biệt cả các bản chạy trên iOS. */
function browserOf(ua: string): string {
  if (!ua) return "";
  if (/CriOS/i.test(ua)) return "Chrome (iOS)";
  if (/FxiOS/i.test(ua)) return "Firefox (iOS)";
  if (/EdgiOS/i.test(ua)) return "Edge (iOS)";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/CocCoc/i.test(ua)) return "Cốc Cốc";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "";
}

/**
 * Chất lượng đường truyền.
 *
 * `effectiveType` KHÔNG cho biết loại kết nối vật lý, dù tên gọi gợi ý như vậy:
 * nó chỉ xếp hạng tốc độ đo được vào bốn bậc mượn tên công nghệ di động. Một
 * máy Mac cắm cáp quang vẫn ra "4g" — nghĩa là "nhanh ngang 4G trở lên", chứ
 * không phải "đang dùng 4G". Nhãn cũ ghi "4G / Wi-Fi nhanh" khiến người đọc
 * tưởng biết được loại mạng, nên đổi sang mô tả đúng thứ nó đo: tốc độ.
 */
function network(net: string, downlink: number): string {
  const kind =
    net === "4g"
      ? "nhanh"
      : net === "3g"
        ? "trung bình"
        : net === "2g"
          ? "chậm"
          : net === "slow-2g"
            ? "rất chậm"
            : "";
  const speed = downlink ? `${(downlink / 10).toFixed(1)} Mbps` : "";
  return [speed, kind].filter(Boolean).join(" · ");
}

/**
 * Nghi ngờ VPN / proxy.
 *
 * Chỉ so tên múi giờ là ra dương tính giả: một người Việt đang ở Nhật, hoặc
 * ai đó cố ý đặt lệch giờ máy, đều bị gắn cờ oan. Cách chắc hơn là so ĐỘ LỆCH
 * GIỜ thật sự — nếu hai nơi cùng một mốc giờ (Asia/Bangkok với
 * Asia/Ho_Chi_Minh đều +7) thì không có gì đáng ngờ.
 *
 * Vẫn là "nghi ngờ" chứ không phải kết luận: người đi công tác, du học, hay
 * để máy sai giờ đều tạo ra chênh lệch thật mà không dùng VPN.
 */
function vpnFlag(tz: string, tzClient: string): boolean {
  if (!tz || !tzClient || tz === tzClient) return false;
  try {
    const now = new Date();
    const off = (zone: string) => {
      const s = now.toLocaleString("en-US", { timeZone: zone, timeZoneName: "longOffset" });
      const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      return m ? Number(m[1]) * 60 + (m[1].startsWith("-") ? -1 : 1) * Number(m[2] ?? 0) : null;
    };
    const a = off(tz);
    const b = off(tzClient);
    // Không đọc được thì thà không cảnh báo còn hơn cảnh báo sai.
    if (a === null || b === null) return false;
    return a !== b;
  } catch {
    return false;
  }
}
export default function VisitorsPage() {
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [days, setDays] = React.useState(7);
  const [bots, setBots] = React.useState(false);
  const [humanOnly, setHumanOnly] = React.useState(false);
  const [mine, setMine] = React.useState(false);
  const [own, setOwn] = React.useState<{ cid: string; label: string }[]>([]);
  const [open, setOpen] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"people" | "timeline">("people");
  const [people, setPeople] = React.useState<Person[]>([]);
  const [recent, setRecent] = React.useState<Hit[]>([]);
  const [totals, setTotals] = React.useState<Totals>({
    hits: 0,
    visitors: 0,
    bot_hits: 0,
    human_hits: 0,
    humans: 0,
  });

  const load = React.useCallback(
    async (alive: () => boolean = () => true) => {
      const res = await fetch(
        `/api/admin/visits?days=${days}&bots=${bots ? 1 : 0}&human=${humanOnly ? 1 : 0}&mine=${mine ? 1 : 0}`,
      );
      if (!alive()) return;
      if (res.status === 401) {
        setAuthed(false);
        setReady(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (!alive()) return;
        setError(body.error ?? `Lỗi ${res.status}`);
        setAuthed(true);
        setReady(true);
        return;
      }
      const data = (await res.json()) as {
        people: Person[];
        recent: Hit[];
        totals: Totals;
        own: { cid: string; label: string }[];
      };
      if (!alive()) return;
      setPeople(data.people);
      setRecent(data.recent);
      setTotals(data.totals);
      setOwn(data.own ?? []);
      setError("");
      setAuthed(true);
      setReady(true);
    },
    [days, bots, humanOnly, mine],
  );

  // Nạp lại mỗi khi đổi khoảng thời gian hoặc bật/tắt bot. Chốt `alive` để
  // không ghi state vào component đã unmount khi bấm nhanh liên tiếp.
  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  /** Đánh dấu (hoặc bỏ đánh dấu) một máy là của mình. */
  async function markOwn(cid: string, label: string, remove: boolean) {
    if (!cid) return;
    await fetch("/api/admin/own", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cid, label, remove }),
    });
    await load();
  }

  const isOwn = (cid: string) => own.some((o) => o.cid === cid);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Đăng nhập thất bại.");
      return;
    }
    setPassword("");
    await load();
  }

  if (!ready) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 font-sans text-sm text-zinc-500">
        Đang tải…
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="max-w-sm mx-auto px-4 py-24 font-sans">
        <h1 className="font-sans font-bold text-lg text-black mb-1">Nhật ký lượt xem</h1>
        <p className="text-xs text-zinc-500 mb-6">{SITE_DOMAIN}</p>
        <form onSubmit={login} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Mật khẩu"
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full bg-black text-white text-xs font-mono uppercase tracking-wider py-2.5 rounded disabled:opacity-40"
          >
            {busy ? "Đang kiểm tra…" : "Đăng nhập"}
          </button>
        </form>
        {error && <p className="mt-4 text-xs text-red-700">{error}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 font-sans">
      <header className="border-b border-zinc-200 pb-4 mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-sans font-bold text-lg text-black">Nhật ký lượt xem</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{SITE_DOMAIN} · giữ 90 ngày gần nhất</p>
          </div>
          <a
            href="/admin"
            className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 hover:text-black shrink-0"
          >
            ← Bài viết
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`font-mono text-[10px] uppercase tracking-wider border rounded px-2.5 py-1.5 transition-colors ${
                days === d
                  ? "bg-black text-white border-black"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black"
              }`}
            >
              {d === 1 ? "24 giờ" : `${d} ngày`}
            </button>
          ))}
          <span className="w-px h-5 bg-zinc-200 mx-1" />
          <button
            onClick={() => setBots((b) => !b)}
            className={`font-mono text-[10px] uppercase tracking-wider border rounded px-2.5 py-1.5 transition-colors ${
              bots
                ? "bg-amber-600 text-white border-amber-600"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black"
            }`}
            title="Googlebot, máy quét uptime, công cụ xem trước link…"
          >
            {bots ? "Đang hiện bot" : "Đang ẩn bot"}
          </button>
          <button
            onClick={() => setHumanOnly((h) => !h)}
            className={`font-mono text-[10px] uppercase tracking-wider border rounded px-2.5 py-1.5 transition-colors ${
              humanOnly
                ? "bg-emerald-700 text-white border-emerald-700"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black"
            }`}
            title="Chỉ hiện lượt đã chứng minh có người thật: cuộn trang, bấm, hoặc ở lại trên 15 giây"
          >
            {humanOnly ? "Chỉ người thật" : "Tất cả"}
          </button>
          <button
            onClick={() => setMine((m) => !m)}
            className={`font-mono text-[10px] uppercase tracking-wider border rounded px-2.5 py-1.5 transition-colors ${
              mine
                ? "bg-sky-700 text-white border-sky-700"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black"
            }`}
            title={
              own.length
                ? `Đang bỏ qua ${own.length} máy của bạn. Bấm để xem cả chúng.`
                : "Chưa đánh dấu máy nào. Mở một dòng rồi bấm 'Đây là máy tôi'."
            }
          >
            {mine ? "Kể cả máy tôi" : `Bỏ qua máy tôi${own.length ? ` (${own.length})` : ""}`}
          </button>
          <button
            onClick={() => void load()}
            className="font-mono text-[10px] uppercase tracking-wider border border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black rounded px-2.5 py-1.5"
          >
            Tải lại
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-mono">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Người thật"
          value={totals.humans ?? 0}
          hint="đã xác nhận"
          accent
        />
        <Stat label="Tổng người xem" value={totals.visitors} hint="IP khác nhau" />
        <Stat label="Lượt xem" value={totals.hits} hint="gồm cả bot" />
        <Stat label="Của bot" value={totals.bot_hits ?? 0} hint="máy quét" />
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-zinc-200">
        <Tab on={tab === "people"} onClick={() => setTab("people")}>
          Theo người xem ({people.length})
        </Tab>
        <Tab on={tab === "timeline"} onClick={() => setTab("timeline")}>
          Dòng thời gian ({recent.length})
        </Tab>
      </div>

      {tab === "people" ? (
        people.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {people.map((p) => (
              <li
                key={p.who}
                className="border border-zinc-200 rounded-lg bg-white overflow-hidden"
              >
                <button
                  onClick={() => setOpen(open === p.who ? null : p.who)}
                  className="w-full text-left p-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[13px] text-zinc-900 font-bold">
                        {flag(p.country)} {p.ip || "—"}
                      </span>
                      <Badge {...trust(p)} />
                      {vpnFlag(p.tz, p.tz_client) && (
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5 bg-purple-50 text-purple-800 border-purple-200"
                          title={`Múi giờ theo IP (${p.tz}) lệch giờ thật so với múi giờ máy (${p.tz_client}). Có thể là VPN/proxy, nhưng cũng có thể là người đang đi công tác, du học, hoặc để máy sai giờ.`}
                        >
                          Lệch giờ
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-zinc-500 mt-1.5">
                      {[p.city, p.region, p.country].filter(Boolean).join(", ") ||
                        "không rõ vị trí"}
                      {p.asn ? ` · ${p.asn}` : ""}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400 mt-0.5">
                      {device(p)}
                      {p.webview ? ` · trong ${p.webview}` : ""}
                      {network(p.net, p.downlink) ? ` · ${network(p.net, p.downlink)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-[13px] text-zinc-900 font-bold">{p.hits}</p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      lượt · {p.pages} trang
                    </p>
                    {p.total_dwell > 0 && (
                      <p className="font-mono text-[10px] text-emerald-700 mt-0.5">
                        đọc {dur(p.total_dwell)}
                        {p.scroll > 0 ? ` · ${p.scroll}%` : ""}
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-zinc-500 mt-1">{when(p.last_ts)}</p>
                  </div>
                </button>

                {open === p.who && (
                  <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-mono text-[10px] text-zinc-600 leading-relaxed flex-1">
                        {trust(p).why}
                      </p>
                      {p.cid && (
                        <button
                          onClick={() =>
                            void markOwn(p.cid, device(p), isOwn(p.cid))
                          }
                          className={`font-mono text-[9px] uppercase tracking-wider border rounded px-2 py-1 shrink-0 transition-colors ${
                            isOwn(p.cid)
                              ? "bg-sky-700 text-white border-sky-700"
                              : "border-zinc-300 text-zinc-600 hover:border-sky-700 hover:text-sky-800"
                          }`}
                          title="Máy đã đánh dấu sẽ bị bỏ qua trong thống kê — hữu ích khi chính bạn hay mở trang để kiểm tra"
                        >
                          {isOwn(p.cid) ? "✓ Máy tôi" : "Đây là máy tôi"}
                        </button>
                      )}
                    </div>
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      <Field k="Địa chỉ IP" v={p.ip} />
                      <Field
                        k="Mã máy"
                        v={p.cid || "—"}
                        hint="Lưu trong trình duyệt, nhận ra cùng một máy kể cả khi IP đổi"
                      />
                      <Field k="Số IP đã dùng" v={p.ips > 1 ? `${p.ips} (IP động)` : "1"} />
                      <Field
                        k="Toạ độ"
                        v={p.lat && p.lon ? `${p.lat}, ${p.lon}` : "—"}
                        link={
                          p.lat && p.lon
                            ? `https://www.google.com/maps?q=${p.lat},${p.lon}`
                            : undefined
                        }
                        hint="Vị trí trạm mạng, không phải chỗ người đó ngồi"
                      />
                      <Field k="Mã bưu chính" v={p.postal || "—"} />
                      <Field k="Múi giờ (IP)" v={p.tz || "—"} />
                      <Field k="Múi giờ (máy)" v={p.tz_client || "—"} />
                      <Field k="Ngôn ngữ" v={p.lang || "—"} />
                      <Field k="Máy chủ CF" v={p.colo || "—"} hint="Trung tâm dữ liệu đã phục vụ" />
                      <Field k="Giao thức" v={[p.proto, p.tls].filter(Boolean).join(" · ") || "—"} />
                      <Field
                        k="Độ trễ mạng"
                        v={
                          p.rtt
                            ? `${p.rtt} ms`
                            : p.rtt_client
                              ? `${p.rtt_client} ms`
                              : "—"
                        }
                        hint="Cloudflare không đo được với HTTP/3 (chạy trên UDP), khi đó lấy số do trình duyệt đo"
                      />
                      <Field
                        k="Tốc độ mạng"
                        v={network(p.net, p.downlink) || "—"}
                        hint="Tốc độ trình duyệt đo được, KHÔNG cho biết là 4G hay Wi-Fi. Safari không hỗ trợ nên thường trống"
                      />
                      <Field
                        k="Mở trong ứng dụng"
                        v={p.webview || "trình duyệt thường"}
                        hint="Messenger, Zalo, Instagram… mở link bằng trình duyệt nhúng riêng"
                      />
                      <Field k="Màn hình" v={p.screen || "—"} />
                      <Field
                        k="Card đồ hoạ"
                        v={p.gpu ? (chip(p.gpu) !== p.gpu ? `${chip(p.gpu)} — ${p.gpu}` : p.gpu) : "—"}
                        hint="Trên iPhone luôn là 'Apple GPU' chung chung; trên máy tính thì nói rõ tên card"
                        wide
                      />
                      <Field
                        k="Đời máy"
                        v={p.model || guessModel(p.screen, p.ua, p.gpu) || "—"}
                        hint="Máy tính suy từ chip đồ hoạ, điện thoại suy từ độ phân giải — chuỗi nhận dạng không nói tên máy"
                      />
                      <Field
                        k="Hệ điều hành"
                        v={
                          osVersion(p.ua, p.os_version)
                            ? `${osName(p.ua)} ${osVersion(p.ua, p.os_version)}`
                            : osName(p.ua) || "—"
                        }
                        hint="Mac và Windows đóng băng số này trong chuỗi nhận dạng (Mac luôn khai 10.15.7), nên ưu tiên số do trình duyệt tự khai"
                      />
                      <Field
                        k="Trình duyệt"
                        v={browserOf(p.ua) || "—"}
                      />
                      <Field
                        k="Phần cứng"
                        v={
                          [
                            p.cpu ? `${p.cpu} nhân` : "",
                            p.ram ? `${p.ram} GB RAM` : "",
                            p.touch ? "cảm ứng" : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"
                        }
                      />
                      <Field k="Đọc lâu nhất" v={dur(p.dwell)} />
                      <Field k="Cuộn tới" v={p.scroll ? `${p.scroll}%` : "—"} />
                      <Field k="Nguồn" v={source(p.referer)} />
                      <Field k="Ghé lần đầu" v={when(p.first_ts)} />
                      <Field k="Trình duyệt" v={p.ua || "—"} wide />
                    </dl>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : recent.length === 0 ? (
        <Empty />
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                {["Lúc", "IP", "Nơi", "Trang", "Nguồn", "Thiết bị", "Đọc", "Đánh giá"].map((h) => (
                  <th
                    key={h}
                    className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((h, i) => (
                <tr
                  key={`${h.ts}-${i}`}
                  className={`border-b border-zinc-100 last:border-0 ${h.bot ? "opacity-45" : ""}`}
                >
                  <td className="font-mono text-[11px] text-zinc-500 px-3 py-2 whitespace-nowrap">
                    {clock(h.ts)}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-900 px-3 py-2 whitespace-nowrap">
                    {flag(h.country)} {h.ip || "—"}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-500 px-3 py-2 whitespace-nowrap">
                    {h.city || "—"}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-700 px-3 py-2 max-w-[220px] truncate">
                    {h.path}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-500 px-3 py-2 whitespace-nowrap">
                    {source(h.referer)}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-500 px-3 py-2 whitespace-nowrap">
                    {h.bot ? "bot" : device(h)}
                    {h.webview ? ` · ${h.webview}` : ""}
                  </td>
                  <td className="font-mono text-[11px] text-zinc-500 px-3 py-2 whitespace-nowrap">
                    {h.dwell ? dur(h.dwell) : "—"}
                    {h.scroll ? ` · ${h.scroll}%` : ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Badge {...trust(h)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 mt-6 leading-relaxed">
        Bấm vào một dòng để xem đầy đủ thông tin máy, mạng và vị trí.{" "}
        <strong>Người thật</strong> nghĩa là đã có cuộn trang, bấm chuột hoặc ở lại trên 15 giây —
        đây là bằng chứng đáng tin hơn nhiều so với việc đọc chuỗi nhận dạng trình duyệt, vì máy
        quét chép chuỗi đó rất dễ nhưng không giả được hành vi.{" "}
        <strong>Chưa rõ</strong> thường là công cụ xem trước link (Messenger, Zalo) hoặc người
        chặn JavaScript.
      </p>
      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
        Vị trí và nhà mạng do Cloudflare cung cấp, chỉ chính xác tới mức thành phố và thường là
        vị trí trạm mạng. Chỉ các trang chính được ghi (trang chủ, bài viết,{" "}
        <code className="font-mono">/about</code>, <code className="font-mono">/projects</code>);
        ảnh, CSS, JS đi thẳng tới kho tĩnh nên không được ghi. Dữ liệu tự xoá sau 90 ngày.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg px-3 py-3 ${
        accent ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
      }`}
    >
      <p
        className={`font-mono text-[10px] uppercase tracking-wider ${
          accent ? "text-emerald-800" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-sans font-bold text-2xl mt-1 leading-none ${
          accent ? "text-emerald-900" : "text-black"
        }`}
      >
        {value ?? 0}
      </p>
      <p className="font-mono text-[10px] text-zinc-400 mt-1">{hint}</p>
    </div>
  );
}

/** Nhãn mức tin cậy. `why` nhận vào để dùng chung kiểu với `trust()`, không hiển thị ở đây. */
function Badge({ label, cls, why }: { label: string; cls: string; why: string }) {
  return (
    <span
      title={why}
      className={`font-mono text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${cls}`}
    >
      {label}
    </span>
  );
}

/** Một ô trong bảng chi tiết. */
function Field({
  k,
  v,
  hint,
  link,
  wide,
}: {
  k: string;
  v: string;
  hint?: string;
  link?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
      <dt
        className="font-mono text-[9px] uppercase tracking-wider text-zinc-400"
        title={hint}
      >
        {k}
      </dt>
      <dd className="font-mono text-[11px] text-zinc-800 break-words">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-sky-800 hover:underline"
          >
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}

function Tab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] uppercase tracking-wider px-3 py-2 border-b-2 -mb-px transition-colors ${
        on ? "border-black text-black" : "border-transparent text-zinc-500 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

function Empty() {
  return (
    <p className="text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-lg px-4 py-10 text-center">
      Chưa có lượt xem nào trong khoảng thời gian này.
    </p>
  );
}
