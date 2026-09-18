#!/usr/bin/env node
/**
 * Tối ưu ảnh trong public/assets: resize theo KÍCH THƯỚC HIỂN THỊ THẬT, rồi xuất WebP.
 *
 *   node tools/optimize-images.mjs
 *
 * Vì sao resize chứ không chỉ nén: logo hiển thị ở 24px (`w-6 h-6`) nhưng file gốc
 * 1280×1280 — thừa ~2.800 lần số pixel. Nén WebP không sửa được chuyện đó, phải resize.
 *
 * Quy tắc chọn `target`: kích thước CSS lớn nhất × 3 (đủ cho màn hình 3x), làm tròn lên.
 * Giữ một bản fallback cho trình duyệt không đọc được WebP (<picture>).
 *
 * PHẦN MỞ RỘNG PHẢI KHỚP NỘI DUNG THẬT. Nghe hiển nhiên, nhưng repo này đã sai:
 * `hero.png`, `avatar.png`, `shopee-logo.png` đều là JPEG bên trong — `file`
 * báo "JPEG image data" còn máy chủ thì gắn `content-type: image/png` theo đuôi
 * file. Trình duyệt bỏ qua được vì chúng tự đoán lại theo nội dung, nhưng
 * `X-Content-Type-Options: nosniff` (đã bật trong public/_headers) cấm đúng
 * việc đoán đó — ảnh sẽ hỏng ở chính những trình duyệt cần tới fallback.
 *
 * Nên fallback giờ xuất theo ĐỊNH DẠNG PHÙ HỢP VỚI ẢNH:
 *   - ảnh chụp / nhiều màu, không cần trong suốt  -> JPEG (nhỏ hơn PNG nhiều lần)
 *   - logo có nền trong suốt                      -> PNG (JPEG không có alpha)
 * và tên file được đổi cho khớp.
 */
import { execFileSync } from "node:child_process";
import { statSync, existsSync, rmSync } from "node:fs";

const ASSETS = "public/assets";

// [tên gốc, kích thước CSS lớn nhất, target = CSS × 3, định dạng fallback]
//
// `fallback` chọn theo bản chất ảnh, không theo đuôi file đang có:
// "jpg" cho ảnh chụp đặc, "png" cho ảnh có vùng trong suốt (đã kiểm bằng
// `sips -g hasAlpha`: hai logo dưới cùng có alpha, ba ảnh trên thì không).
const PLAN = [
  ["hero.png",             700, 1024, "jpg"], // aspect-[4/3] trong cột 8 -> ~700px; giữ 1024
  ["avatar.png",           128,  384, "jpg"], // w-28 h-28 md:w-32 md:h-32
  ["shopee-logo.png",       24,   96, "jpg"], // w-6 h-6
  ["lazada-logo.png",       24,   96, "png"], // nền trong suốt
  ["tiktokshops-logo.png",  24,   96, "png"], // nền trong suốt
];

const kb = (p) => (statSync(p).size / 1024).toFixed(1);
let before = 0, after = 0;

for (const [file, css, target, fallback] of PLAN) {
  const src = `${ASSETS}/${file}`;
  if (!existsSync(src)) { console.log(`  ⚠️  bỏ qua (không có): ${file}`); continue; }

  const webp = src.replace(/\.png$/, ".webp");
  const out = src.replace(/\.png$/, `.${fallback}`);
  const b = Number(kb(src));

  // sips resize tại chỗ file tạm, rồi cwebp
  const tmp = `/tmp/opt-${file}`;
  execFileSync("sips", ["-Z", String(target), src, "--out", tmp], { stdio: "ignore" });
  execFileSync("cwebp", ["-q", "82", "-quiet", tmp, "-o", webp]);
  // Fallback: resize + ép ĐÚNG định dạng, ghi ra file có đuôi tương ứng.
  // `-s format` là phần bắt buộc — thiếu nó thì sips giữ nguyên định dạng nội
  // dung của nguồn và ta lại có một file JPEG mang tên .png như trước.
  const fmt = fallback === "jpg" ? "jpeg" : "png";
  const opts = fallback === "jpg" ? ["-s", "formatOptions", "80"] : [];
  execFileSync(
    "sips",
    ["-s", "format", fmt, ...opts, "-Z", String(target), src, "--out", out],
    { stdio: "ignore" },
  );
  // Đuôi đổi (png -> jpg) thì file cũ không còn ai trỏ tới: xoá để khỏi đem
  // theo một bản thừa lên máy chủ.
  if (out !== src) rmSync(src);

  const a = Number(kb(webp)), fbNow = Number(kb(out));
  before += b; after += a;
  console.log(
    `  ${file.padEnd(24)} ${String(b).padStart(7)} KB → webp ${String(a).padStart(6)} KB` +
    `  (${fallback} fallback ${fbNow} KB, ${target}px, hiển thị ${css}px)`
  );
}

console.log(`  ${"─".repeat(24)} ${"─".repeat(30)}`);
console.log(`  ${"TỔNG (đường WebP)".padEnd(24)} ${before.toFixed(1).padStart(7)} KB → ${after.toFixed(1).padStart(6)} KB  giảm ${(100 - after * 100 / before).toFixed(0)}%`);
