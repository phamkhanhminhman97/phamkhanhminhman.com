# Mục /syllabus — giáo trình công khai

> **Dành cho AI agent khác (và người) đọc trước khi sửa `/syllabus`, `scripts/*syllabus*` hoặc PDF ghi tay.**
> Làm ngày 2026-10-16. Nếu mâu thuẫn với yêu cầu mới của chủ repo thì yêu cầu mới thắng.

## 1. Mục đích và quyết định

Chủ repo muốn mở nhanh giáo trình và PDF ghi tay trên iPad mà không cần mở laptop. Đã chốt:

- **Công khai, không đăng nhập** (chủ repo chọn ngày 16/10). Vì vậy chỉ đưa lên những gì chủ repo đã chọn.
- **Nội dung tiếng Việt** (giữ nguyên giáo trình), nhưng **URL tiếng Anh**: `/syllabus`, `/syllabus/linear-algebra`,
  `/syllabus/linear-algebra/<slug>`. Đổi URL sau khi đã được index thì phải redirect 301.
- Hiện chỉ có **môn 2 (Đại số tuyến tính), 10 bài**; **3 bài đầu có PDF ghi tay**. Bài 4-10 chưa có PDF.
- `/notes` giữ nguyên cho bài đúc kết viết tiếng Anh; `/syllabus` là bản đọc giáo trình gốc.

## 2. Luồng dữ liệu (đọc kỹ phần snapshot)

```
study/self/ai-foundations/syllabus/mon-02-dai-so-tuyen-tinh/*.md   (nguồn bài)
study/self/ai-foundations/summaries/mon-02-bai-0N-ghi-tay.pdf      (PDF)
        │  npm run syllabus:sync  (= node scripts/prepare-syllabus.mjs, chạy tự động ở predev/prebuild)
        ▼
src/data/syllabus/linear-algebra.json   ← snapshot HTML đã lọc, CÓ trong git
public/syllabus/linear-algebra/*.pdf    ← PDF chép sang, CÓ trong git
        │  next build
        ▼
out/  → Cloudflare Workers Assets
```

**Vì sao có snapshot trong git:** Cloudflare chỉ clone repo website, không có repo `ai-foundations`. Khi không thấy
nguồn, `prepare-syllabus.mjs` dùng snapshot đã commit và kiểm đủ 10 bài, đủ HTML, PDF khớp mã băm (PDF bị sửa tay
là build dừng). Quên commit snapshot sau khi sửa nguồn = site đăng bản cũ mà không báo lỗi.

## 3. Danh sách xuất bản là danh sách tường minh

`scripts/syllabus-catalog.mjs` liệt kê từng bài (file nguồn → slug → tiêu đề → mô tả) và bài nào có PDF. **Không quét
thư mục.** Muốn thêm bài/PDF/môn thì sửa file này, chạy `npm run syllabus:sync`, rồi commit snapshot. Thêm môn mới còn
cần một trang `src/app/syllabus/<course>/` và mục trong `/syllabus` (hiện mã đặt riêng cho môn 2).

## 4. Cách sửa

| Cần sửa | Làm |
|---|---|
| Chữ trong bài | Sửa `.md` ở `ai-foundations` → `npm run syllabus:sync` → commit snapshot |
| PDF ghi tay | Sửa `summaries/sources/mon-02-bai-0N-ghi-tay.py` → `./summaries/build.sh` → `npm run syllabus:sync` → commit PDF + snapshot |
| Giao diện | `src/app/syllabus/`, `src/components/syllabus/`, `syllabus.css` (nền trắng, chữ đen; cỡ chữ tối thiểu 11-12px cho iPad) |
| Chuỗi giao diện | `src/content/copy.ts` → `copy.syllabus` |

## 5. Quy ước kỹ thuật

- **HTML được lọc** (`rehype-sanitize`): bỏ HTML thô, script, ảnh cục bộ; link tương đối chỉ trỏ tới bài đã đăng.
  Tham chiếu tới môn/tài liệu chưa đăng thành chữ gạch chấm (trang bài có ghi chú một lần).
- **Không có LaTeX:** bài giảng viết công thức bằng ký tự Unicode và khối code, không có `$...$`. Đã đo: 0 công thức.
  Đừng bật `remark-math`: một cặp `$` trong văn xuôi sẽ bị biến thành công thức.
- **Bảng GFM:** dấu `|` cắt ô kể cả khi nằm trong code (`` `|x|` ``), làm mất chữ ở cột sau; phải viết `` `\|x\|` ``.
  `*(chú thích)*` dính liền chữ đứng trước thì hiện dấu `*` thô; cần một dấu cách. Test chặn `*` thô trong bản xuất.
- **Component client chỉ nhận `summaries`**, không import `@/data/syllabus` (cả nội dung bài sẽ nằm trong JS trình duyệt).
  Đã kiểm: build xong không chunk nào chứa nội dung bài.
- **Vị trí đọc** lưu `localStorage` (khoá `pkmm.syllabus.linear-algebra.position.v1`): chỉ trên trình duyệt đó, không
  đồng bộ iPad ↔ laptop. Không có cookie hay máy chủ theo dõi.
- Trang đi thẳng Asset Worker (không nằm trong `run_worker_first`), nên không ghi vào nhật ký lượt truy cập `/admin`.
- `DesignPattern-master` (thư mục cục bộ trong .gitignore) được loại khỏi `tsconfig.json` và ESLint để build cục bộ chạy.

## 6. Kiểm trước khi báo xong

`npm run syllabus:test` (6 test: lọc HTML, link, mục lục, ký tự Unicode, snapshot sạch và không còn `*` thô, `\|` trong bảng) · `npm run typecheck` ·
`npm run lint` (0 cảnh báo) · `npm run build` · xem bằng `npx wrangler dev` (không dùng `next dev`).
Quy ước repo vẫn giữ: **không `git push`** (push `main` tự deploy), không `npm run deploy`, chỉ commit khi được bảo.

## 7. Chưa làm / chưa kiểm

- Chưa xem trên iPad thật; mới thử khung nhìn 390, 820 và 1180 px bằng trình duyệt tích hợp.
- PDF cho bài 4-10; các môn khác; RSS riêng cho giáo trình.
- `npm audit` (16/10/2026) báo 18 lỗ hổng (1 critical, 15 high). Chúng nằm ở `next` 16.2.6, `eslint-config-next` và
  `wrangler`; không gói nào do mục `/syllabus` thêm vào. Npm báo `next@16.4.2` sửa được mục critical mà không đổi bản chính.
  Chưa nâng cấp vì ngoài phạm vi; nên làm riêng và chạy lại `npm run build`.
