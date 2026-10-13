# Mục /notes — ghi chú học tập (KẾ HOẠCH, chưa triển khai)

> **Dành cho AI agent khác (và người) đọc trước khi làm.** File này ghi lại một quyết định thiết kế đã
> được bàn với chủ repo và những gì cần làm tiếp. **Tới ngày 2026-10-13 chưa có dòng code nào của mục này
> được viết** — mọi đường dẫn bên dưới là hiện trạng thật của repo, đã kiểm tra, không phải đề xuất.
>
> Đừng suy ra ý định từ file này nếu nó mâu thuẫn với yêu cầu mới của chủ repo: yêu cầu mới thắng.

## 1. Ý tưởng một đoạn

Chủ repo (Phạm Khánh Minh Mẫn — backend engineer, từ 2026 là học viên cao học) đang học một syllabus dài
ở `../thesis-verbalize-memory/knowledge/00-notes/syllabus/` (12 thư mục `mon-02-…` tới `mon-13-…`; riêng
môn 2 có 10 bài, môn 10 có 7 bài) và muốn đăng những gì mình **đúc kết được** khi học. Thay vì trộn vào blog
kỹ thuật, tạo **một mục riêng `/notes`** cho ghi chú học tập. Blog giữ nguyên là nơi đăng bài backend tự đo.

## 2. Vì sao tách (đây là lý do, không phải sở thích)

| | Blog (`/blog`, hiện có 10 bài) | Notes (`/notes`, mới) |
|---|---|---|
| Nội dung | Bài backend/e-commerce, **mỗi con số tự đo**, nêu môi trường | Ghi chú học tập, đúc kết từ sách/khoá học + phần tự kiểm chứng |
| Cam kết với người đọc | "Tôi đã chạy và đo" | "Tôi đang học và ghi lại" — gọi đúng tên, không giả làm nghiên cứu gốc |
| Giọng/CTA | "Need an integration?" (tìm khách tích hợp Shopee/TikTok/Lazada) | Không dùng CTA bán dịch vụ |
| Quy mô dự kiến | vài bài mỗi quý | hàng chục bài theo tiến độ syllabus |

Nếu trộn: vài chục bài toán sẽ nhấn chìm 10 bài backend, đổi hình ảnh của site (site đang định vị "backend,
tích hợp sàn thương mại điện tử"), và buộc mọi ghi chú phải theo tiêu chuẩn "tự đo" của blog.

## 3. Quyết định đã chốt

1. **Tách thành mục riêng.** Không để chung danh sách phẳng với blog.
2. **Làm nhỏ.** Dùng lại component bài viết hiện có (`BlogArticle`, mục lục, nút copy code). Chỉ thêm một
   trường để phân biệt loại bài + trang danh sách riêng + link điều hướng.
3. **CHƯA làm** (cố ý, đừng thêm "cho đủ bộ"): series (`series: { name, part }`), callout "Part N of…",
   điều hướng bài trước/sau, thanh lọc category, trang syllabus/roadmap. Điều kiện bật lại: khi `/notes` có
   **từ 3–5 bài** — lúc đó mới biết chia theo chủ đề nào. Dựng hạ tầng cho một bài là dựng cho thứ chưa tồn tại.

## 4. Quyết định còn mở (agent làm, nhưng PHẢI báo lại cho chủ repo)

- **URL bài:** khuyến nghị `/notes/<slug>`. Lý do: chưa từng có URL cũ nên không cần redirect; Google chưa
  index gì để mất. Nếu chọn giữ `/blog/<slug>` cho mọi bài thì Worker không phải sửa, nhưng URL nói sai loại
  bài. Đổi URL **sau khi** đã được index mới phải redirect 301 — quyết định ngay từ đầu.
- **RSS:** tách `/notes/rss.xml` hay gắn nhãn chung. Hiện `/rss.xml` có tiêu đề kênh "… — Technical Blog".
  Khuyến nghị: không trộn notes vào feed blog; feed riêng chỉ khi có ≥3 bài.
- **Chỗ đặt link:** site hiện **không có menu đa trang**; điều hướng trang chủ là các nút cuộn trong
  `src/components/HomePage.tsx` (publications / research / blog / contact, chuỗi ở `src/content/copy.ts` →
  `nav`). Cần chọn: thêm mục thứ năm, hoặc link từ section Research (đang có sẵn trên trang chủ và About).

## 5. Điểm chạm trong code (hiện trạng, đã đọc)

Mọi chỗ dưới đây đang giả định **chỉ có một loại bài**. Thêm `/notes` mà bỏ sót chỗ nào là lỗi âm thầm.

| File | Hiện làm gì | Cần xử lý |
|---|---|---|
| `src/data/blog/types.ts` | Interface `BlogPost` (slug, date, category, title, readTime, description, content) | Thêm `section?: "blog" \| "notes"` — **mặc định `blog`** để 10 bài cũ không phải sửa |
| `src/data/blog/index.ts` | Mảng `blogPosts` chứa mọi bài, đăng ký bằng import tay | Chứa cả hai loại; tạo hai danh sách đã lọc (blog / notes) và dùng đúng danh sách ở từng nơi dưới đây |
| `src/app/blog/[slug]/page.tsx` | `generateStaticParams`, metadata, JSON-LD `BlogPosting` với URL `/blog/<slug>` | Route notes mới (tái dùng `BlogArticle`); chỉ sinh route cho đúng loại bài, nếu không cùng bài có hai URL (trùng nội dung) |
| `src/components/BlogArticle.tsx` | Khung bài; cột phải liệt kê **mọi** `blogPosts` ("Other posts", link `/blog/…`) + CTA "Need an integration?" | Lọc "Other posts" theo loại; notes không dùng CTA bán dịch vụ |
| `src/components/HomePage.tsx` | Section `#blog` render từ `blogPosts` (có `data-post-slug`, class `blog-list`) | Notes **không** được lọt vào đây; thêm đường vào `/notes` |
| `src/content/copy.ts` | Toàn bộ chuỗi UI (nav, blog.*) | Thêm chuỗi mới **ở đây**, không hardcode trong JSX |
| `src/app/sitemap.ts` | Map `blogPosts` → `/blog/<slug>`; `lastModified` lấy ngày thật của bài (cố ý, đừng đổi thành `new Date()`) | Thêm trang `/notes` và các URL notes |
| `src/app/rss.xml/route.ts` | RSS chỉ cho blog | Xem §4 |
| `src/app/post-manifest.json/route.ts` | JSON danh sách bài cho trang admin | Thêm trường loại bài |
| `src/app/admin/page.tsx` | Ẩn/ghim/đổi thứ tự bài; link `/blog/<slug>` | Hiện loại bài; sửa link theo loại |
| `worker/index.ts` | `slugOf()` chỉ khớp `^/blog/<slug>`; dùng cho **nhật ký lượt xem** và **ẩn bài → 404**; `filterFeed()` lọc `<item>/<url>` có chuỗi `/blog/<slug>`; HTMLRewriter theo `[data-post-slug]`; trạng thái ẩn/ghim lưu trong KV `POST_META` **theo slug** | Nếu chọn `/notes/<slug>`: mở rộng regex của `slugOf` và `filterFeed`, nếu không bài notes **không** được ghi lượt xem và ẩn bài trên /admin **không có tác dụng**. Slug phải **duy nhất giữa hai loại** vì dùng chung KV |
| `src/lib/seo.ts` | `alternatesFor`, `openGraphFor` | Dùng cho route mới, đừng tự viết canonical |

Worker và trang tĩnh deploy chung (Cloudflare). Thử Worker cần `wrangler dev`; `next dev` không chạy Worker, nên
các nhánh ẩn bài/ghi lượt xem **không** kiểm tra được chỉ bằng `next dev`.

## 6. Quy ước bắt buộc của repo

Do chủ repo yêu cầu (đã nhắc nhiều lần):

- **Không `git push`** (push lên `main` tự deploy), **không** chạy `npm run deploy`. Chỉ commit khi được bảo.
  Commit message tiếng Việt **không dấu**, có tiền tố `feat:` / `fix:` / `docs:`.
- Không in nội dung `.env`, khoá `.pem`, token. Trên web **ẩn tên khách hàng**. Không đụng
  `../moment.pkmm.online`.
- Site **English-first**: giao diện và bài viết bằng tiếng Anh (`/vi` đã bị gỡ, Worker 301 về bản tiếng Anh).
  Tài liệu nội bộ như file này và README viết tiếng Việt. Ghi chú gốc trong syllabus bằng tiếng Việt → bài đăng
  phải **viết lại** bằng tiếng Anh, không dịch từng câu.
- `AGENTS.md`: đây là phiên bản Next.js có breaking change — đọc `node_modules/next/dist/docs/` trước khi viết code.
- Kiểm tra trước khi báo xong: `npm run typecheck`, `npm run lint` (hiện **0 cảnh báo**, giữ nguyên), `npm run build`.
- Dev server: cổng 3000 là của chủ repo, đừng tắt; tự bật cổng khác (ví dụ `npx next dev -p 3100`) rồi tắt khi xong.

Lỗi biên dịch đã gặp thật (Next 16.2.6, SWC): trong JSX, một đoạn text **nhiều dòng có HTML entity** (`&ldquo;`,
`&apos;`…) bị **mất dấu cách đầu đoạn** — `<code>x</code> with “q”` ra `xwith`. Chữa: viết `{" "}` ngay sau thẻ.
Phát hiện: duyệt DOM, tìm text node liền sau `code/a/strong/em` bắt đầu bằng chữ cái. Đã sửa ở 20 chỗ của 8 bài;
bài mới phải tự kiểm.

## 7. Bài đầu tiên (đã khảo sát, chưa viết)

- **Nguồn:** `../thesis-verbalize-memory/knowledge/00-notes/syllabus/mon-02-dai-so-tuyen-tinh/`
  `bai-01-vector-tich-vo-huong.md` (+ `bai-01.py`, `bai-01.ipynb`); phần anisotropy nằm ở
  `mon-10-he-thong-quanh-mo-hinh/bai-03-embedding-va-anisotropy.md`.
- **Slug đề xuất:** `the-geometry-behind-vector-search`. **Đừng** giữ tiêu đề "Why RAG uses cosine instead of
  Euclidean" (xem bên dưới).
- **Đã kiểm chứng bằng numpy (10.000 vector × 768 chiều):**
  - Sau khi chuẩn hoá L2, **Euclid và cosine xếp hạng top-10 giống hệt nhau** (đúng cả thứ tự), vì
    `‖u−v‖² = 2 − 2·cos` khi `‖u‖ = ‖v‖ = 1` (đẳng thức đã kiểm). Ví dụ "bài dài bị Euclid phạt nhầm" chỉ đúng với
    vector **chưa chuẩn hoá** (đếm từ, TF-IDF). Phần lớn embedding model hiện đại đã xuất vector chuẩn hoá sẵn.
  - Hai vector ngẫu nhiên 768 chiều: cosine trung bình 0.0016, độ lệch chuẩn 0.0367 ≈ `1/√768 = 0.0361`
    (so với 2 chiều: 0.71) — cơ sở của câu "gần vuông góc".
  - Bảng dịch tâm trong ghi chú (§4b): cosine thô 0.656 → 0.997 khi dịch tâm 0 → 10, trong khi `corrcoef` giữ
    0.658. Chạy lại được bằng 6 dòng numpy trong ghi chú.
- **CHƯA kiểm chứng — không được đăng như sự thật:**
  - "Mọi cặp câu trong embedding thật có cosine 0.87–0.93". Con số 0.9525 trong ghi chú môn 10 đến từ **mô phỏng giả**
    (cộng hằng số vào đúng một chiều của dữ liệu ngẫu nhiên). Việc đo trên embedding thật là **bài tập §12 của ghi chú,
    chưa làm**. (Một bản nháp đề xuất còn ghi 0.85–0.93, lệch ghi chú; không có nguồn nào cho cả hai.)
  - Hiệu ứng tần suất của SLP3: ghi chú tự thừa nhận "tôi chưa tái tạo được".
  - Cách đo đúng: `sentence-transformers` **chưa cài** trên máy. Cài vào môi trường tạm (venv), ghi rõ tên model +
    phiên bản, đo trên một corpus nhỏ nhưng thật, báo số thật **kể cả khi khác 0.87–0.93**, rồi xoá môi trường.
- **Lỗi cần tránh khi viết:** cosine nằm trong `[−1, 1]` (bản nháp từng ghi 0→1); phép nhân ma trận `Q × Dᵀ` chỉ đúng
  với tìm kiếm vét cạn, index xấp xỉ như HNSW **không** làm vậy; mean-centering phải áp **cả lên query** và phải
  **chuẩn hoá lại** sau khi trừ trung bình, nếu không phá giả định "đã chuẩn hoá".
- **Nối với backend (lý do bài hợp với site):** pgvector có `<=>` (khoảng cách cosine), `<#>` (**tích vô hướng, trả giá
  trị ÂM** vì Postgres chỉ hỗ trợ index scan ASC), `<->` (L2). Một truy vấn thật trên Postgres 18 làm bài đứng vững
  hơn việc chỉ giải thích hình học.
- **Bố cục gợi ý:** hình học (cái bóng, `a·b = ‖a‖‖b‖cosθ`, `proj`, trực giao = không có bóng) **rút ngắn** — phần này ai cũng
  giảng. Dồn chỗ cho phần của riêng chủ repo: bẫy lệch tâm, số đo embedding thật, truy vấn pgvector thật.
- **Nhãn:** ghi rõ đây là ghi chú học tập, nêu nguồn (MML §6.4.6 tr.195-197; 3Blue1Brown *Essence of Linear Algebra*
  ch.1 và ch.9).

## 8. Định nghĩa hoàn thành

- [ ] Bài cũ không đổi URL, không đổi nội dung; trang chủ và `/blog` **không** hiện bài notes.
- [ ] `/notes` liệt kê đúng bài notes; có đường vào từ trang chủ.
- [ ] Sitemap có URL notes; RSS theo quyết định ở §4; canonical/OG đúng loại bài.
- [ ] Ẩn một bài notes trên /admin → 404 + biến khỏi danh sách (thử bằng `wrangler dev`, không phải `next dev`).
- [ ] `typecheck`, `lint` (0 cảnh báo), `build` qua; quét dính chữ trên mọi bài bằng DOM → 0 chỗ.
- [ ] Bảng/khối code không tràn ngang trên màn hình 390px (bảng nhiều cột dùng khung `overflow-x-auto`, mẫu có ở
      `src/data/blog/posts/refresh-token-rotation-measured.tsx`).
- [ ] Cập nhật README (mục tính năng) và `plan.md` cho khớp; **commit, chưa push**.
- [ ] Báo lại chủ repo các quyết định đã chọn ở §4.

## 9. Mở rộng sau này (đừng làm trước)

Khi `/notes` có 3–5 bài: cân nhắc series + callout đầu bài, điều hướng bài trước/sau, thanh lọc theo chủ đề, và trang
syllabus (12 môn, môn/bài nào đã có bài thì sáng lên thành link). Quyết định lúc đó dựa trên chủ đề thực tế của các bài đã có.

