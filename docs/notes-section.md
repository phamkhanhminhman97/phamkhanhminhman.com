# Mục /notes — ghi chú học tập

> **Dành cho AI agent khác (và người) đọc trước khi sửa blog, sitemap, RSS, Worker hoặc `/notes`.**
> Mục này đã triển khai (commit `5dd2d40`, `d30735d`) và đã được review, sửa lỗi ngày 2026-10-14. Mọi đường
> dẫn dưới đây là hiện trạng của repo. Nếu mâu thuẫn với yêu cầu mới của chủ repo thì yêu cầu mới thắng.

## 1. Mục đích

Chủ repo (Phạm Khánh Minh Mẫn — backend engineer, từ 2026 là học viên cao học) học một syllabus ở
`../thesis-verbalize-memory/knowledge/00-notes/syllabus/` và muốn đăng những gì mình đúc kết. Ghi chú học
tập nằm ở **`/notes`**, tách khỏi **`/blog`** (bài backend tự đo).

| | Blog (`/blog`) | Notes (`/notes`) |
|---|---|---|
| Nội dung | Bài backend/e-commerce, mỗi con số tự đo | Ghi chú học tập + phần tự kiểm chứng |
| Cam kết với người đọc | "Tôi đã chạy và đo" | "Tôi đang học và ghi lại", gọi đúng tên |
| CTA | "Need an integration?" (tìm khách) | Khối "Study notes" mô tả phạm vi, không bán dịch vụ |

## 2. Quyết định đã chọn (báo lại cho chủ repo)

- **URL:** `/notes` và `/notes/<slug>`. Chưa từng có URL cũ nên không cần redirect. Đổi URL sau khi đã được index
  thì phải redirect 301, nên đừng đổi.
- **RSS:** `/rss.xml` chỉ chứa blog, **không** trộn notes. Làm feed riêng khi `/notes` có từ 3 bài.
- **Lối vào:** mục "STUDY NOTES" trong cột điều hướng của trang chủ (`src/components/HomePage.tsx`, chuỗi ở
  `src/content/copy.ts` → `nav.notes`).
- **Chưa làm (cố ý):** series, callout "Part N", bài trước/sau, lọc theo chủ đề, trang syllabus. Điều kiện bật lại:
  khi `/notes` có 3–5 bài, lúc đó mới biết chia theo chủ đề nào.

## 3. Kiến trúc (đọc kỹ phần bundle)

```
src/data/blog/types.ts   BlogPost, PostSummary (không có content), toSummary()
src/data/blog/index.ts   blogPosts   — CHỈ bài blog. Trang chủ và /blog/* import file này
src/data/blog/notes.ts   notesPosts  — CHỈ bài notes. Chỉ /notes/* import
src/data/blog/all.ts     allPosts    — cả hai, dùng ở server (post-manifest). Kiểm slug trùng ngay lúc build
```

**Vì sao tách:** component client (`HomePage`, `NotesList`, `RelatedPosts`) trước đây import thẳng registry, nên
nội dung mọi bài — kể cả KaTeX của bài notes (274 KB, 80 KB gzip) — nằm trong bundle trình duyệt của mọi trang.
Giờ page (server) truyền `PostSummary[]` qua props. **Đừng import `@/data/blog/notes`, `@/data/blog/all` hoặc một
file bài từ component client**; `katex` chỉ được import từ server component (`Math.tsx`, `VectorProjectionCards.tsx`).
Kiểm bằng: build rồi tìm chunk JS trong `out/_next/static/chunks` có chứa "katex" — phải không có.

| File | Vai trò |
|---|---|
| `src/app/notes/page.tsx`, `src/app/notes/[slug]/page.tsx` | Trang danh sách và trang bài (canonical, OG, JSON-LD) |
| `src/components/BlogArticle.tsx` | Khung bài dùng chung. Nhận `related` qua props; gán `id` cho `h2/h3` ngay trong HTML tĩnh (`src/lib/heading-ids.tsx`) |
| `src/components/NotesList.tsx`, `RelatedPosts.tsx` | Danh sách client, có `.blog-list` + `data-post-slug` để Worker ẩn/ghim được |
| `src/app/sitemap.ts`, `post-manifest.json/route.ts` | Sitemap có URL notes; manifest cho /admin kèm `section` |
| `worker/index.ts` | `slugOf()` nhận `/blog|notes/<slug>`, `.html`, `.txt`, `/__next*.txt`; `filterFeed()` khớp theo ranh giới slug |
| `wrangler.jsonc` | `run_worker_first` có `/notes` và `/notes/*` |

**Thêm một ghi chú:** tạo `src/data/blog/posts/<slug>.tsx` với `section: "notes"`, thêm vào mảng trong `notes.ts`.
Slug phải **duy nhất giữa blog và notes** vì KV `POST_META` khoá theo slug (`all.ts` ném lỗi lúc build nếu trùng).
Ghi chú gốc trong syllabus bằng tiếng Việt → bài đăng viết lại bằng tiếng Anh, không dịch từng câu.

## 4. Ẩn / ghim bài hoạt động thế nào

Worker gỡ thẻ `[data-post-slug]` của bài ẩn khỏi HTML của mọi trang đi qua nó, chèn
`window.__PKMM_HIDDEN__` (danh sách **mọi** bài ẩn, không chỉ bài có thẻ trong trang đó) vào `<head>`, và trả 404
cho mọi đường dẫn phục vụ bài đó: `/notes/x`, `/x/`, `/x.html`, `/x.txt`, `/x/__next*.txt`. Client đọc cùng danh sách
(`src/lib/post-visibility.ts`) để hydrate ra đúng DOM. **Chỉ kiểm được bằng `wrangler dev`**, không phải `next dev`.
Câu "chưa có ghi chú" ở `/notes` luôn nằm trong DOM và hiện bằng CSS (`.blog-list:empty + .notes-empty`), để khi ẩn
hết bài thì HTML Worker trả về và DOM React vẫn khớp.

**Giới hạn:** ẩn không xoá metadata (slug, ngày, tiêu đề, mô tả) khỏi payload Next.js nhúng trong `/notes`; thân bài
thì không có ở đó. Và Worker phải bỏ `ETag`/`Last-Modified` của trang HTML (`isDynamicPage`): nếu không, người xem
đã lưu trang nhận 304 và mãi thấy bản cũ sau khi bạn ẩn / bỏ ẩn / ghim bài. Cả hai đã kiểm bằng `wrangler dev`.

## 5. Quy ước bắt buộc của repo

- **Không `git push`** (push lên `main` tự deploy), **không** chạy `npm run deploy`. Chỉ commit khi được bảo. Commit
  message tiếng Việt **không dấu**, có tiền tố `feat:` / `fix:` / `docs:`.
- Không in nội dung `.env`, khoá `.pem`, token. Trên web **ẩn tên khách hàng**. Không đụng `../moment.pkmm.online`.
- Site **English-first**; tài liệu nội bộ như file này viết tiếng Việt. Chuỗi giao diện đặt ở `src/content/copy.ts`.
- `AGENTS.md`: đây là Next.js có breaking change — đọc `node_modules/next/dist/docs/` trước khi viết code.
- Trước khi báo xong: `npm run typecheck`, `npm run lint` (**0 cảnh báo**), `npm run build`.
- Dev server cổng 3000 là của chủ repo, đừng tắt; tự bật cổng khác (`npx next dev -p 3100`) rồi tắt khi xong.
- Lỗi SWC của Next 16.2.6: trong JSX, đoạn text nhiều dòng có HTML entity (`&ldquo;`, `&apos;`) mất dấu cách đầu đoạn
  sau thẻ `</code>`, `</a>`... Chữa: viết `{" "}` ngay sau thẻ, rồi quét DOM tìm text node liền sau code/a/strong/em
  bắt đầu bằng **bất kỳ ký tự nào không phải khoảng trắng hay dấu câu đóng** (không chỉ chữ cái: bản quét chỉ bắt chữ cái
  từng bỏ sót `</em> (Ch. 1` vì "(" đứng đầu).

## 6. Bài đầu tiên: `the-geometry-behind-vector-search`

Nguồn: `../thesis-verbalize-memory/knowledge/00-notes/syllabus/mon-02-dai-so-tuyen-tinh/bai-01*` và
`mon-10-he-thong-quanh-mo-hinh/bai-03-embedding-va-anisotropy.md`. Mọi số trong bài đã được chạy lại (Python 3.9,
NumPy 2.0.2; PostgreSQL 18.6 + pgvector 0.8.7 trong Docker). Điều đã kiểm chứng và điều **chưa**:

- Đã đo: top-10 của cosine và L2 giống nhau ở 50/50 truy vấn khi chuẩn hoá, 0/50 khi không; `<#> * -1` khớp
  `1 - <=>` (sai lệch 6e-8); `DESC` trên index HNSW rơi về Sort + Seq Scan, B-tree vẫn quét ngược; ba toán tử
  `<#> <=> <->` có thời gian quét vét cạn nằm trong sai số (~20 ms / 20.000 dòng × 768 chiều).
- Ví dụ anisotropy là **dữ liệu tổng hợp** (một chiều bị dịch và khuếch đại): 99,9961% trên 1.999.000 cặp > 0,90; sau
  khi trừ trung bình và chuẩn hoá lại thì 0%. Không có nghĩa là embedding thật hành xử như vậy.
- **Chưa đo:** cosine trung bình của embedding thật (ghi chú môn 10 có con số 0,87–0,93 nhưng đến từ mô phỏng). Muốn
  đăng con số này phải cài `sentence-transformers` vào venv tạm, ghi rõ tên model + phiên bản, đo trên corpus nhỏ, báo số
  thật dù khác kỳ vọng, rồi xoá venv. Cũng chưa đo HNSW hay recall.

## 7. Việc còn lại

- Bài notes tiếp theo (chọn từ syllabus), và đo embedding thật nếu muốn đưa con số đó vào bài.
- Khi `/notes` có 3–5 bài: cân nhắc RSS riêng, series, lọc chủ đề, trang syllabus (môn/bài nào đã có bài thì sáng lên).
