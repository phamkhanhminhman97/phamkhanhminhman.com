/**
 * Số liệu npm LẤY TỪ REGISTRY, không phải gõ tay.
 *
 * Vì sao có file này: trước đây mỗi con số npm trên site nằm ở một chỗ khác
 * nhau và tự trôi khỏi sự thật theo thời gian —
 *
 *   - `tag: "API Client • v1.0.8"` gõ cứng trong projects.tsx, trong khi npm
 *     đã ở 2.3.0;
 *   - thẻ từng gói fetch số tải THẬT, nhưng ô tổng ở cột phải lại cộng hằng số
 *     `defaultDownloads`. Kết quả: cùng một màn hình hiện "84/week" ở thẻ và
 *     "~3,090" ở tổng — lệch 8,5 lần, người đọc nhìn thấy ngay.
 *
 * Với một trang mà mục đích là để người khác đánh giá độ tin cậy, một con số
 * bịa hại hơn là không có con số nào. Nên: một lần fetch, một nguồn, mọi chỗ
 * hiển thị đọc chung.
 */

/** Bốn gói đều hỏi trong MỘT request — endpoint bulk nhận danh sách ngăn bằng dấu phẩy. */
const DOWNLOADS_BULK = "https://api.npmjs.org/downloads/point/last-week/";

/**
 * Registry. Gọi với header `Accept: application/vnd.npm.install-v1+json` —
 * bản rút gọn (`corgi`) nặng ~2,8KB nén thay vì ~80KB của packument đầy đủ,
 * mà vẫn có đủ `dist-tags.latest` và `modified`. Header `Accept` nằm trong
 * danh sách an toàn của CORS nên không phát sinh preflight.
 */
const REGISTRY = "https://registry.npmjs.org/";
const CORGI = "application/vnd.npm.install-v1+json";

export interface NpmRelease {
  npmName: string;
  version: string;
  /** Mốc thay đổi gần nhất của gói — với các gói này chính là lần publish cuối. */
  modified: string;
}

export interface NpmLiveStats {
  /** Lượt tải tuần trước, theo tên gói trên npm. Thiếu khoá = chưa lấy được. */
  downloads: Record<string, number>;
  /** Phiên bản mới nhất, theo tên gói trên npm. */
  versions: Record<string, string>;
  /** Các lần phát hành, mới nhất trước — nguồn cho mục "Latest updates". */
  releases: NpmRelease[];
}

export const EMPTY_STATS: NpmLiveStats = { downloads: {}, versions: {}, releases: [] };

/**
 * Lấy lượt tải của nhiều gói trong một lần gọi.
 *
 * CẠM BẪY: endpoint này đổi HÌNH DẠNG kết quả theo số gói hỏi.
 *
 *   nhiều gói -> { "shopee-api-client": { downloads: 84 }, ... }
 *   MỘT gói   -> { downloads: 84, package: "shopee-api-client" }   ← phẳng!
 *
 * Trang chi tiết dự án chỉ hỏi đúng một gói, nên nếu chỉ xử lý dạng lồng thì
 * nó luôn hiện "—" trong khi API trả về số hoàn toàn bình thường. Đã dính
 * đúng lỗi này một lần khi gộp hai chỗ gọi về chung một hàm.
 *
 * Ngoài ra API đặt `null` cho gói không tra được thay vì bỏ trống, nên mọi
 * giá trị đều phải kiểm tra kiểu trước khi dùng.
 */
async function fetchDownloads(npmNames: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const res = await fetch(DOWNLOADS_BULK + npmNames.join(","));
    if (!res.ok) return out;
    const data = (await res.json()) as Record<string, unknown>;

    if (npmNames.length === 1) {
      const n = (data as { downloads?: unknown }).downloads;
      if (typeof n === "number" && Number.isFinite(n)) out[npmNames[0]] = n;
      return out;
    }

    for (const name of npmNames) {
      const n = (data[name] as { downloads?: unknown } | null)?.downloads;
      if (typeof n === "number" && Number.isFinite(n)) out[name] = n;
    }
  } catch {
    // Mất mạng hoặc npm lỗi: trả về rỗng. Chỗ gọi sẽ hiện "—" chứ không hiện số cũ.
  }
  return out;
}

/**
 * Phiên bản + ngày phát hành của từng gói. Một request mỗi gói (registry không
 * có API bulk), nhưng chạy song song nên vẫn chỉ tốn một vòng mạng.
 */
async function fetchReleases(npmNames: string[]): Promise<NpmRelease[]> {
  const entries = await Promise.all(
    npmNames.map(async (npmName): Promise<NpmRelease | null> => {
      try {
        const res = await fetch(REGISTRY + npmName, { headers: { Accept: CORGI } });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          "dist-tags"?: { latest?: unknown };
          modified?: unknown;
        };
        const version = data["dist-tags"]?.latest;
        if (typeof version !== "string") return null;
        const modified = typeof data.modified === "string" ? data.modified : "";
        return { npmName, version, modified };
      } catch {
        return null;
      }
    }),
  );
  return entries
    .filter((e): e is NpmRelease => e !== null)
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

/**
 * Gọi cả hai nhóm song song. Một nhóm hỏng KHÔNG kéo theo nhóm kia: số tải và
 * số phiên bản là hai nguồn độc lập, mất cái này vẫn hiện được cái kia.
 */
export async function fetchNpmStats(npmNames: string[]): Promise<NpmLiveStats> {
  const [downloads, releases] = await Promise.all([
    fetchDownloads(npmNames),
    fetchReleases(npmNames),
  ]);
  const versions = Object.fromEntries(releases.map((r) => [r.npmName, r.version]));
  return { downloads, versions, releases };
}

/** `2026-09-08T...` -> `09/2026`. Chuỗi rỗng thì trả rỗng, không in "NaN". */
export function releaseMonth(modified: string): string {
  const d = new Date(modified);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/**
 * Tổng lượt tải — CHỈ cộng những gói đã lấy được số thật.
 *
 * Trả về `null` khi chưa có gói nào: khác hẳn với 0, và bắt chỗ hiển thị phải
 * xử lý trạng thái "chưa biết" thay vì in ra một con số trông như sự thật.
 */
export function totalDownloads(stats: NpmLiveStats): number | null {
  const values = Object.values(stats.downloads);
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0);
}
