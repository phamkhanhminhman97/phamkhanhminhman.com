# phamkhanhminhman.com - Portfolio & Blog

Trang web cá nhân và tài liệu mã nguồn mở của **Phạm Khánh Minh Mẫn** — xây dựng bằng **Next.js 16.2.6 (App Router)**, **Tailwind CSS v4**, **TypeScript 5** và xuất bản dưới dạng **Static Export (HTML/CSS/JS)** lên **Cloudflare Workers** (static assets + một Worker nhỏ ở `worker/index.ts`). Giao diện được thiết kế theo phong cách báo chí học thuật (academic-editorial) sang trọng tối giản.

🌐 **Website:** [phamkhanhminhman.com](https://phamkhanhminhman.com)

---

## Tính Năng Nổi Bật

- **📄 Project Detail Pages:** 4 trang chi tiết cho từng thư viện npm (Shopee, TikTok, Lazada, All-in-One) với code examples, số liệu thống kê downloads, và hướng dẫn cài đặt nhanh.
- **👤 About / CV Page:** Trang giới thiệu cá nhân với timeline kinh nghiệm làm việc, kỹ năng, học vấn, kèm **CV PDF tải về** (`public/cv/`, sinh từ cùng dữ liệu — xem "Tạo lại CV").
- **📝 Blog:** 3 bài viết kỹ thuật (Shopee API, Webhook Security, Monorepo) với syntax highlighting và định dạng học thuật.
- **🔍 SEO Đầy Đủ:** `sitemap.xml` và `robots.txt` tự động, `generateMetadata` cho từng trang/blog/project.
- **🕒 Clock & Weather Widget:** Đồng hồ hệ thống tự động cập nhật và widget thời tiết thời gian thực tại TP. Hồ Chí Minh sử dụng Open-Meteo API.
- **📊 Thống kê npm:** Tự động kết nối npm Registry API để hiển thị số lượt tải các thư viện mỗi tuần.
- **🎨 Hình ảnh AI Độc quyền:** Ảnh minh họa bàn làm việc dạng pixel-art và avatar cá nhân phong cách 8-bit từ AI.
- **🌐 Song ngữ, mặc định tiếng Anh:** `/` là **English**, `/vi` là tiếng Việt, có công tắc `EN / VI` ở header. Kèm `hreflang` + `x-default` trong `<head>` và trong `sitemap.xml`.
- **🖥️ Systems Section:** ba hệ thống đang làm, mô tả **kỹ thuật, ẩn danh khách hàng** (`profile.systems`).
- **🔬 Research Section:** Mục nghiên cứu sau đại học (câu hỏi · phương pháp · trạng thái trung thực · từ khoá) trên cả trang chủ và trang About.
- **📬 Form liên hệ không Backend:** Web3Forms qua biến môi trường; chưa cấu hình thì tự rơi về `mailto:`.
- **🔎 SEO nâng cao:** `metadataBase`, OpenGraph, Twitter Card, title template, và **JSON-LD `Person` schema** (quyết định Google hiển thị ra sao khi ai đó gõ đúng tên).
- **♿ Skip-link** tới `<main id="main">` cho người dùng bàn phím.
- **⚡ Static Export siêu nhẹ:** Trang là file tĩnh do Cloudflare phục vụ thẳng; Worker chỉ đứng trước vài đường dẫn (admin, ẩn/ghim bài, nhật ký lượt xem).
- **🚫 Custom 404 Page:** Trang báo lỗi 404 được thiết kế riêng.

---

## ⚠️ Quy tắc nội dung — đọc trước khi sửa `profile.tsx`

**1. Không nêu tên khách hàng.** Mảng `systems` mô tả *loại hệ thống và phần kỹ thuật*, không
nêu tên công ty khách hàng, tên module nội bộ, hay mã ticket. Đây là công việc có ràng buộc bảo mật.

**2. Không tuyên bố quá thực tế.** Mục `research` là **nghiên cứu độc lập, chưa chốt làm đề tài
luận văn** — `venue` và `honestNote` phải giữ đúng như vậy. Khi nào GVHD duyệt thì mới đổi.

**3. Experience = 1 câu tóm tắt + 2-4 gạch đầu dòng.** Không viết đoạn văn dài. Trường `summary`
trả lời *"hệ thống đó là gì"*, `highlights` trả lời *"mình đã làm gì"* — ưu tiên thứ đo được.

## Song ngữ — cách hoạt động

```
/            → English  (mặc định, không có tiền tố)
/about       → English
/vi          → Tiếng Việt
/vi/about    → Tiếng Việt
/blog/*      → MỘT URL, nội dung tiếng Việt (đánh dấu lang="vi")
/projects/*  → MỘT URL, mô tả gói vốn đã bằng tiếng Anh
```

**Vì sao blog/projects không nhân đôi:** nội dung của chúng không song ngữ. Tạo `/vi/blog/...`
chỉ để đổi phần khung sẽ sinh **trùng nội dung** cho SEO. Thay vào đó trang chủ bản EN hiện một
ghi chú nói rõ các bài viết bằng tiếng Việt.

**Không có tự động chuyển theo trình duyệt.** Static export không chạy được Proxy/middleware
(xem `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`), nên công tắc `EN / VI`
ở header là lối vào duy nhất — phải luôn hiển thị.

| File | Vai trò |
|---|---|
| `src/i18n/config.ts` | danh sách locale, `href(lang, path)`, `HTML_LANG` |
| `src/i18n/dictionary.ts` | **toàn bộ chữ giao diện**, hai bản EN/VI |
| `src/i18n/metadata.ts` | `alternatesFor()` sinh `hreflang` + canonical |
| `src/i18n/types.ts` | `Localized<T> = { en: T; vi: T }` |
| `src/data/profile.tsx` | dữ liệu dùng `Localized<>` ở đúng trường khác nhau |
| `src/components/HomePage.tsx` · `AboutPage.tsx` | nhận prop `lang`, route chỉ là vỏ mỏng |

Thêm chữ mới: khai trong `Dictionary` (TypeScript sẽ bắt buộc điền **cả hai** ngôn ngữ).

## Ảnh Open Graph

`src/app/opengraph-image.png` (1200×630) theo [file convention của Next](node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md) —
Next tự sinh `og:image`, `width`, `height`, `type`. Nguồn để sửa lại: `tools/og-image.html`.

Dựng lại sau khi sửa HTML:

```bash
npm run dev                     # cần dev server đang chạy
cp tools/og-image.html public/__og.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --hide-scrollbars --window-size=1200,630 \
  --screenshot=src/app/opengraph-image.png http://localhost:3000/__og.html
cp src/app/opengraph-image.png src/app/twitter-image.png && rm public/__og.html
```

## Cấu Trúc Dự Án

```
src/
├── app/
│   ├── about/
│   │   └── page.tsx          # Trang giới thiệu / CV
│   ├── blog/
│   │   └── [slug]/
│   │       └── page.tsx      # Trang chi tiết bài viết
│   ├── projects/
│   │   └── [slug]/
│   │       └── page.tsx      # Trang chi tiết thư viện npm
│   ├── globals.css           # Tailwind v4 + custom styles
│   ├── layout.tsx            # Root layout (fonts, metadata)
│   ├── not-found.tsx         # Custom 404
│   ├── page.tsx              # Landing page chính
│   ├── robots.ts             # robots.txt generator
│   └── sitemap.ts            # sitemap.xml generator
├── components/
│   └── NpmStatsCard.tsx      # Client component: npm download stats
└── data/
    ├── blog.tsx              # Dữ liệu và nội dung blog
    ├── profile.tsx           # Dữ liệu profile/CV
    └── projects.tsx          # Dữ liệu các thư viện npm
```

---

## Phát triển ở Local

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000).

3. **Build biên dịch tĩnh:**
   ```bash
   npm run build
   ```
   Các file HTML tĩnh biên dịch thành công sẽ nằm ở thư mục `out/`.

---

## Tech Stack

| Công nghệ | Phiên bản |
|-----------|-----------|
| [Next.js](https://nextjs.org/) | 16.2.6 (App Router, Turbopack) |
| [React](https://react.dev/) | 19.2.4 |
| [TypeScript](https://www.typescriptlang.org/) | 5.x |
| [Tailwind CSS](https://tailwindcss.com/) | v4 |
| [Lucide React](https://lucide.dev/) | Icons |
| [Open-Meteo API](https://open-meteo.com/) | Weather data |
| [npm Registry API](https://api.npmjs.org/) | Download stats |
| [Web3Forms](https://web3forms.com/) | Contact form |

---

## Cấu Hình Cần Lưu Ý

### Web3Forms Access Key (form liên hệ)

Copy `.env.example` → `.env.local` rồi điền key lấy ở <https://web3forms.com>:

```bash
NEXT_PUBLIC_WEB3FORMS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### 🔴 Trên Cloudflare — đọc kỹ, chỗ này dễ nhầm

Có **hai chỗ đặt biến** trong dashboard của Worker, và chỉ một chỗ đúng cho key này:

| Chỗ | Dùng cho |
|---|---|
| **Settings → Build → Build variables** (Workers Builds) | `NEXT_PUBLIC_WEB3FORMS_KEY` — **đặt ở đây** |
| **Settings → Variables and secrets** | Biến lúc chạy của Worker (`ADMIN_PASSWORD`, `SESSION_SECRET`) — đặt key form ở đây là vô tác dụng |

Lý do: `NEXT_PUBLIC_*` là biến **LÚC BUILD**, không phải lúc chạy.
Nó bị nhúng thẳng vào file JS khi `next build`. Biến runtime của Cloudflare **không bao giờ**
dùng được cho nó.

Kiểm chứng:

```bash
NEXT_PUBLIC_WEB3FORMS_KEY= npm run build && grep -rl "<key>" out/   # -> 0 file
npm run build                            && grep -rl "<key>" out/   # -> 1 file
```

**Deploy: chỉ cần `git push`.** Worker đã nối với GitHub qua **Workers Builds**, push lên
`main` là Cloudflare tự build (dùng Build variables ở trên) và deploy lên production. Xem mục
"Triển khai" bên dưới.

`npm run deploy` (build ở máy với `.env.local` rồi `wrangler deploy`) vẫn dùng được, nhưng
là **đường tay, dự phòng** — ví dụ khi Workers Builds lỗi. Đừng chạy nó sau mỗi lần push: bản
đó đã được deploy rồi, chạy thêm chỉ đẻ ra một bản deploy trùng.

`npm run build` chạy `prebuild` → `scripts/check-build-env.mjs`, in cảnh báo khung vàng nếu
thiếu khoá. Không có nó thì rất dễ deploy một bản không có form mà không ai nhận ra, vì trang
vẫn build và chạy bình thường.

> ⚠️ **Key này KHÔNG bí mật, và không thể bí mật.** Đây là static export nên `NEXT_PUBLIC_*`
> được **nhúng thẳng vào file JS** lúc build — kiểm được:
> ```bash
> grep -rl "$NEXT_PUBLIC_WEB3FORMS_KEY" out/_next/static/chunks/
> ```
> Web3Forms thiết kế như vậy: key dùng ở phía client, và họ **chặn POST từ server** (gọi bằng
> `curl` sẽ nhận `"This method is not allowed"`) — đó chính là cơ chế chống lạm dụng của họ.
>
> Vậy để `.env.local` (gitignored) có tác dụng gì? **Giữ key khỏi lịch sử git.** Repo public bị
> scrape liên tục; key nằm trong bundle thì chỉ người vào site mới thấy, nằm trong git history
> thì tồn tại vĩnh viễn. Nếu bị spam: tạo key mới ở Web3Forms, đổi biến môi trường, build lại.

**Không có key thì trang vẫn chạy đúng:** phần liên hệ tự chuyển sang nút `mailto:` thay vì hiện
một form gửi vào hư không.

**Cách form hoạt động** (`HomePage.tsx` → `onSubmitContact`): gửi bằng `fetch` nên người dùng
**ở lại trang** — có trạng thái `sending` (khoá nút), thông báo thành công/thất bại song ngữ
trong vùng `aria-live`, tự xoá form khi thành công, và nếu lỗi thì hiện luôn địa chỉ email để
gửi tay. Ô `botcheck` ẩn là honeypot của Web3Forms, đừng xoá.

### Cập nhật thông tin cá nhân
Thông tin profile (kinh nghiệm, kỹ năng, học vấn, **research**) nằm ở:
[`src/data/profile.tsx`](src/data/profile.tsx)

Mảng `research` đổ ra **hai chỗ**: card trên trang chủ (`#research`) và mục đầy đủ ở `/about`.
Để mảng rỗng thì cả hai mục tự ẩn — không cần sửa JSX.

### Danh sách thư viện npm
Dữ liệu các package (tên, mô tả, code examples) nằm ở:
[`src/data/projects.tsx`](src/data/projects.tsx)

---

## Triển khai (Cloudflare Workers Builds)

> ⚠️ **Push lên `main` = lên production.** Không có bước duyệt nào ở giữa. Muốn xem trước
> thì chạy ở local (`npm run build && npx wrangler dev --port 8791 --local`) trước khi push.

Site là **một Worker** tên `phamkhanhminhman` (không phải Cloudflare Pages), gồm hai phần:

- **Static assets** — thư mục `out/` do `next build` tạo ra.
- **Worker script** `worker/index.ts` — chỉ chạy trên các đường dẫn khai trong
  `assets.run_worker_first` (admin, ẩn/ghim bài, nhật ký lượt xem).

Worker được nối với repo GitHub qua **Workers Builds**: mỗi lần push lên `main`, Cloudflare
tự build rồi deploy. Kết quả hiện thành check-run *"Workers Builds: phamkhanhminhman"* trên
commit ở GitHub, và trong `npx wrangler deployments list`.

Mọi cấu hình còn lại nằm trong `wrangler.jsonc`, được deploy cùng code:

| Khai trong `wrangler.jsonc` | Là gì |
|---|---|
| `routes` (`custom_domain: true`) | `phamkhanhminhman.com` và `www.` trỏ thẳng vào Worker, Cloudflare tự lo DNS + SSL |
| `kv_namespaces` | Metadata ẩn/ghim bài (`/admin`) |
| `d1_databases` (`DB`) | Nhật ký lượt xem (`/admin/visitors`) |
| `ratelimits` (`LOGIN_LIMIT`) | Chặn dò mật khẩu đăng nhập admin |

Những thứ **không** nằm trong repo, phải đặt một lần trên Cloudflare:

| Cái gì | Đặt ở đâu |
|---|---|
| `NEXT_PUBLIC_WEB3FORMS_KEY` | Workers Builds → **Build variables** |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | `npx wrangler secret put …` (xem "Trang quản trị") |
| Bảng D1 | `npx wrangler d1 migrations apply phamkhanhminhman --remote` — **deploy không tự chạy migration** |

Repo trên GitHub nay là `phamkhanhminhman97/phamkhanhminhman.com`; remote cũ `pkmm.online` vẫn
push được nhờ GitHub tự chuyển hướng, nhưng nên cập nhật:

```bash
git remote set-url origin git@github.com:phamkhanhminhman97/phamkhanhminhman.com.git
```

### Tạo lại CV (`public/cv/Pham-Khanh-Minh-Man-CV.pdf`)

CV PDF sinh từ **chính** `src/data/profile.tsx` (và danh sách gói trong `projects.tsx`), không
có bản chép tay thứ hai. Sửa profile xong thì:

```bash
pip install reportlab          # một lần
python3 tools/build-cv.py      # ghi đè public/cv/Pham-Khanh-Minh-Man-CV.pdf
```

rồi commit file PDF mới cùng với thay đổi profile. Script dùng font hệ thống của macOS
(Georgia, Arial, Arial Unicode cho chữ Nhật), nên chạy ở máy và **không** nằm trong bước build —
quên chạy thì site vẫn phục vụ bản PDF cũ.

---

## Trang quản trị bài viết (`/admin`)

Ẩn bài, ghim bài và đổi thứ tự hiển thị **ngay trên phamkhanhminhman.com**, không cần build
lại và không cần deploy lại. Sửa tiêu đề hay nội dung thì vẫn phải sửa
`src/data/blog/posts/<slug>.tsx` rồi deploy — xem "Vì sao không sửa nội dung ở
đây" bên dưới.

### Kiến trúc

Site vẫn là `output: "export"` (tĩnh hoàn toàn). Phần động do một Worker script
đứng trước assets đảm nhiệm:

```
Trình duyệt
   |
   +-- /api/admin/*  -> Worker: đăng nhập, đọc/ghi metadata trong KV
   +-- /  /vi        -> Worker: gỡ thẻ bài bị ẩn + chèn CSS `order` cho phần ghim
   +-- /blog/<slug>  -> Worker: trả 404 nếu bài đang ẩn
   +-- /rss.xml      -> Worker: lọc bỏ bài ẩn
   +-- /sitemap.xml  -> Worker: lọc bỏ bài ẩn
   +-- mọi thứ khác  -> đi thẳng tới Asset Worker, không qua Worker
```

Chỉ các đường dẫn khai trong `assets.run_worker_first` mới đi qua Worker.

**Ẩn là ẩn thật:** bài bị gỡ khỏi HTML, khỏi RSS, khỏi sitemap, và URL của nó trả
404 — không phải chỉ bị giấu bằng CSS.

### Một chi tiết dễ vấp: hydration

Gỡ thẻ bài khỏi HTML là **chưa đủ**. Dữ liệu bài nằm trong bundle JS, nên sau khi
React hydrate nó sẽ **chèn thẻ đó trở lại DOM**. Đo được đúng như vậy trong lúc
làm.

Vì thế Worker chèn thêm `window.__PKMM_HIDDEN__` vào `<head>` (trước script của
Next), và `HomePage` đọc danh sách đó qua `src/lib/post-visibility.ts` để render ra
kết quả giống hệt HTML mà Worker trả về. Sửa một phía mà quên phía kia là bài ẩn sẽ
hiện lại.

Phần **thứ tự** thì không gặp vấn đề này: nó dùng CSS `order`, không đụng tới DOM.

### Cài đặt lần đầu

```bash
# 1. Đặt mật khẩu đăng nhập (wrangler sẽ hỏi, không gõ vào dòng lệnh)
npx wrangler secret put ADMIN_PASSWORD

# 2. Đặt khoá ký cookie phiên — dùng một chuỗi ngẫu nhiên dài, KHÔNG trùng mật khẩu
npx wrangler secret put SESSION_SECRET
```

`secret put` có hiệu lực ngay, không cần deploy lại. KV namespace đã có sẵn `id` trong
`wrangler.jsonc` (lần deploy đầu tiên wrangler tự tạo và ghi vào). Từ đó trở đi, đổi code
admin thì chỉ cần push.

Chưa đặt secret thì `/api/admin/*` trả 503 kèm thông báo rõ — site công khai vẫn
chạy bình thường.

### Chạy thử ở local

```bash
npm run build && npx wrangler dev --port 8791 --local
```

Cần `.dev.vars` (đã gitignore) ở thư mục gốc:

```
ADMIN_PASSWORD=<mật khẩu chỉ dùng ở local>
SESSION_SECRET=<chuỗi bất kỳ, chỉ dùng ở local>
```

`wrangler dev` dùng KV mô phỏng cục bộ, không đụng tới dữ liệu thật.

### Vì sao không sửa nội dung ở đây

Thân bài là JSX trong `src/data/blog/posts/<slug>.tsx` — bảng nhiều màu, khối code, chú thích
song ngữ. Một cái form không round-trip được thứ đó mà không có nguy cơ làm hỏng
bài, và lỗi chỉ lộ ra lúc build. Nên admin chỉ quản lý metadata; nút "Sửa nội dung"
mở thẳng file trong VS Code.

### Bảo mật

- Mật khẩu và khoá ký nằm trong Worker secret, **không** nằm trong bundle của trang.
- Cookie phiên `HttpOnly; Secure; SameSite=Strict`, ký HMAC-SHA256, hết hạn sau 12 giờ.
- So sánh mật khẩu và chữ ký dùng hàm không phụ thuộc thời gian.
- `/admin` có `noindex, nofollow` và bị chặn trong `robots.txt` — dọn dẹp thôi, phần
  bảo vệ thật là mật khẩu.
- Ghi metadata chỉ nhận đúng ba trường `hidden` / `pinned` / `order`, mọi thứ khác bị bỏ.

## Nhật ký lượt xem (`/admin/visitors`)

Xem IP, thành phố và nhà mạng của những người đã ghé trang — đủ để biết ai là người thật, ai
là máy quét.

### Ghi gì, không ghi gì

Footer của site có một dòng công khai đúng những gì được ghi (`copy.footer.privacy`). Câu đó
và code phải khớp nhau: đổi cột nào ở đây thì sửa luôn câu kia.

| Ghi | Không ghi (đã gỡ) |
| --- | --- |
| IP, quốc gia / thành phố, nhà mạng (ASN) | Toạ độ lat/lon, mã bưu chính |
| Chuỗi User-Agent, đường dẫn, nguồn giới thiệu | Tên card đồ hoạ qua WebGL |
| Kích thước màn hình, số nhân CPU, RAM, có cảm ứng | Đời máy / phiên bản hệ điều hành qua Client Hints |
| Múi giờ, tốc độ mạng, có tương tác hay không | Cookie theo dõi, analytics bên thứ ba |
| Mã ngẫu nhiên `_pk` trong localStorage | |

Toạ độ, WebGL và Client Hints từng có ở vòng đầu. Đã gỡ vì chúng là kỹ thuật **lấy dấu vân
tay trình duyệt** hoặc định vị chi tiết, trong khi câu hỏi duy nhất của trang này là "người
hay máy" — và câu đó trả lời được bằng hành vi (cuộn, bấm, ở lại), không cần biết người ta
dùng chip gì. Cột cũ vẫn còn trong bảng D1 cho khỏi phải migration, nhưng không còn được ghi;
dữ liệu cũ tự hết hạn sau 90 ngày.

### Vì sao phải tự làm

Cloudflare có sẵn ba công cụ, nhưng không cái nào dùng được trên gói Free của zone này:

| Công cụ | Cho biết IP? | Có trên gói Free? |
| --- | --- | --- |
| Web Analytics | Không — cố ý không lưu IP, không cookie | Có |
| Instant Logs | Có | **Không** — từ gói Business |
| Logpush | Có | **Không** — từ gói Pro / Workers Paid |
| Security Events | Có, nhưng chỉ request bị chặn | Có |

Nên Worker tự ghi lấy. IP thật nằm sẵn ở header `cf-connecting-ip` (Cloudflare gắn ở biên,
client không giả mạo được), vị trí và nhà mạng nằm trong `request.cf`.

### Kiến trúc

- Ghi vào D1 (`migrations/0001_visits.sql`), không phải KV: cần truy vấn theo khoảng thời
  gian và gộp theo IP. Free tier D1 tính theo **số hàng** (5 triệu đọc / 100.000 ghi mỗi ngày),
  còn KV tính theo **số lượt gọi** (100.000/ngày) — với một trang cá nhân thì D1 rộng rãi hơn nhiều.
- Ghi qua `ctx.waitUntil` nên người xem không phải chờ. D1 lỗi thì nuốt im lặng: nhật ký là
  thứ phụ, không được phép làm hỏng site.
- Chỉ ghi được đường dẫn nào có trong `assets.run_worker_first` (`wrangler.jsonc`). Ảnh, CSS, JS
  đi thẳng tới Asset Worker nên không được ghi — chủ ý, nếu không mỗi lần mở trang sẽ đẻ ra
  hàng chục dòng rác.
- Bot được đánh dấu **lúc ghi** (`bot` = 1) chứ không lọc lúc đọc, và mặc định bị giấu — không
  thì Googlebot với máy quét uptime lấp hết danh sách người thật.
- Dữ liệu tự xoá sau 90 ngày, dọn theo xác suất ~1/200 lượt xem thay vì nuôi thêm Cron Trigger.

### Làm sao biết là người thật, không phải bot

Đọc chuỗi User-Agent là cách yếu: máy quét chép nguyên chuỗi của Chrome rất dễ, và chuỗi
hiện đại còn bị cố tình làm mờ (mọi iPhone khai giống hệt nhau). Nên mỗi trang nhúng thêm
một đoạn script ~1KB (`beaconScript()` trong `worker/index.ts`) báo về `/api/pulse` ở ba mốc:

| Mức | Nghĩa là | Bằng chứng |
| --- | --- | --- |
| `human = 0` | Chưa rõ | Chỉ có một request trần — `curl` cũng tạo ra được |
| `human = 1` | Trình duyệt thật | JavaScript chạy được |
| `human = 2` | **Người thật** | Có cuộn / bấm / ở lại trên 15 giây |

Mức 2 là thứ máy quét gần như không giả được: phải vừa chạy JavaScript vừa có hành vi.

Script cũng gửi vài thông tin thô: độ phân giải, số nhân CPU, RAM, múi giờ trình duyệt.
**Múi giờ trình duyệt lệch giờ thật với múi giờ theo IP** có thể là VPN — trang quản trị gắn
nhãn `Lệch giờ` cho trường hợp đó (cũng có thể chỉ là người đang ở nước ngoài).

Ngoài ra `cid` (mã máy lưu trong localStorage) là thứ nhận ra "vẫn người đó" khi IP di động
đổi liên tục — gộp theo IP thôi thì một người sẽ bị xé thành nhiều dòng.

### Đọc đúng đời máy và phiên bản iOS

Hai lượt thử trên **cùng một chiếc iPhone 12 chạy iOS 27** cho ra hai chuỗi nhận dạng
mâu thuẫn nhau:

| Trình duyệt | Chuỗi khai | Sự thật |
| --- | --- | --- |
| Chrome iOS | `CPU iPhone OS 27_0_0 … CriOS/152` | Số ở `OS` **đúng** |
| Safari iOS | `CPU iPhone OS 18_7 … Version/27.0` | Số ở `OS` **sai**, số đúng nằm ở `Version/` |

Safari cố tình đóng băng `18_7` để không làm hỏng các trang cũ dò phiên bản, rồi chuyển số
thật sang `Version/`. Đọc bằng một quy tắc chung là sai một trong hai trường hợp, nên
`osVersion()` tách riêng nhánh Safari.

**Đời máy (điện thoại) đoán từ độ phân giải.** Chuỗi nhận dạng chỉ nói `"iPhone"`, không nói
đời nào. Độ phân giải logic là manh mối thô còn lại: bảng `SCREENS` tra ra
`390x844@3 → "iPhone 12/13/14"`. Không tách được các máy dùng chung một cỡ màn, nên trả về cả
nhóm thay vì đoán bừa — đủ để hình dung, không đủ để nhận dạng một người, và thế là vừa.

### Vài chỗ khuất khác

- **`rtt` của Cloudflare luôn rỗng với HTTP/3**, vì HTTP/3 chạy trên QUIC/UDP nên không có
  bắt tay TCP để đo. Đúng nhóm khách hiện đại nhất lại rơi vào lỗ hổng này, nên script tự
  đo lấy qua `PerformanceNavigationTiming` và ghi vào `rtt_client`.
- **Trình duyệt nhúng trong ứng dụng** (Messenger, Zalo, Instagram) có chuỗi nhận dạng gần
  y hệt Safari thường, chỉ khác một mẩu ở cuối. Với một trang hay được gửi qua tin nhắn thì
  đây là nhóm đáng kể, và biết được thì mới hiểu vì sao có lượt "mở rồi thoát ngay".
- **`asn` không phân biệt được 4G với cáp quang**: VNPT vừa bán cáp quang vừa bán VinaPhone,
  cả hai đều ra "Vietnam Posts and Telecommunications Group". Loại kết nối phải hỏi trình
  duyệt (`navigator.connection`), mà Safari lại không hỗ trợ — nên cột này thường trống trên iPhone.

### Máy tính: không đoán đời máy

- **Độ phân giải vô dụng trên máy tính.** Một Mac mini M4 thật cho `1334x1000@2` — không khớp
  máy nào, vì đó là màn ngoài cắm vào. Nên với máy tính, `guessModel()` chỉ trả về loại máy
  kèm độ phân giải (`"Mac (1334x1000)"`), không đoán đời máy.
- **Mac và Windows đóng băng phiên bản trong chuỗi nhận dạng**, y như Safari trên iOS: Mac
  vĩnh viễn khai `"Mac OS X 10_15_7"` (từ 2020), Windows 11 vẫn khai `"Windows NT 10.0"`.
  Nguồn nói thật duy nhất là Client Hints — đã gỡ (xem "Ghi gì, không ghi gì") — nên
  `osVersion()` trả về rỗng cho máy tính thay vì một con số sai.
- **`effectiveType` không nói loại kết nối vật lý**, nên nhãn hiện tốc độ
  (`"10.0 Mbps · nhanh"`) chứ không hiện "4G / Wi-Fi".

`effectiveType` đáng nói riêng: tên gọi gợi ý loại mạng nhưng thực chất chỉ xếp hạng tốc độ
vào bốn bậc mượn tên công nghệ di động. Máy bàn cắm cáp quang vẫn ra `"4g"` — nghĩa là "nhanh
ngang 4G trở lên", không phải "đang dùng 4G".

### Lọc máy của chính mình

Người mở trang này nhiều nhất là mình — sửa xong một chỗ lại vào xem thử. Bốn máy thử đầu
tiên đã chiếm gần hết danh sách "người thật", nên có nút **Đây là máy tôi** trong thẻ chi
tiết: đánh dấu theo `cid` và mọi thống kê sẽ bỏ qua máy đó. Nút **Bỏ qua máy tôi** ở thanh
lọc bật/tắt được khi cần xem lại đầy đủ.

Đánh dấu theo `cid` chứ không theo IP vì IP nhà lẫn IP 4G đều đổi. Đổi lại, xoá dữ liệu
duyệt web sẽ mất dấu và phải đánh dấu lại — chấp nhận được cho một tiện ích dọn nhiễu.

### Bảng tra đời máy đã kiểm chứng

Lượt thử trên điện thoại thật, đối chiếu với sự thật do chủ máy xác nhận (chỉ dùng độ phân
giải và chuỗi nhận dạng — không phụ thuộc WebGL hay Client Hints nên vẫn đúng sau khi gỡ):

| Máy thật | Độ phân giải | Hệ thống đoán | Đúng? |
| --- | --- | --- | --- |
| iPhone 12, Chrome, iOS 27 | `390x844@3` | iPhone 12/13/14 · iOS 27 | ✅ |
| iPhone 12, Safari, iOS 27 | `390x844@3` | iPhone 12/13/14 · iOS 27 | ✅ |
| iPhone 11, Safari, iOS 27 | `414x896@2` | iPhone XR/11 · iOS 27 | ✅ |

### Bắt máy quét giả trình duyệt

Một máy quét thật đã lọt qua vòng lọc đầu vì khai chuỗi trông như Chrome. Nó bị bắt nhờ
**chuỗi tự mâu thuẫn**:

```
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/534.54 ... Chrome/90.0.5 Safari/537.36
                                            ^^^^^^             ^^^^^^^
                                    WebKit bản 2011      Chrome bản 2021
```

Chrome thật dùng `WebKit/537.36` cố định từ 2013 tới nay, và số hiệu luôn có **bốn** phần
(`90.0.4430.212`) chứ không phải ba (`90.0.5`). Người viết máy quét ghép chuỗi từ nhiều mảnh
rời nên hay để lộ kiểu này; trình duyệt thật không bao giờ sai chính tả về chính nó.

Bằng chứng phụ trong cùng lượt đó: cùng một IP, hai request cách nhau 3 giây nhưng **đổi
chuỗi nhận dạng** — cái sau tự khai `Go-http-client/1.1`. Rồi vào thẳng `/` và `/sitemap.xml`,
đúng hành vi lập chỉ mục.

Ba lớp nhận diện hiện có, xếp theo độ chắc chắn:

| Lớp | Bắt được gì | Điểm yếu |
| --- | --- | --- |
| Hành vi (`human >= 2`) | Người thật, không thể giả | Cần JavaScript chạy được |
| Chuỗi tự mâu thuẫn (`fakeUA`) | Máy quét cố giả trình duyệt | Máy quét viết cẩn thận sẽ lọt |
| Từ khoá + nhà mạng máy chủ | Máy quét tự khai, và loại chạy trên cloud thuê | Dương tính giả với VPN doanh nghiệp |

Nhận nhầm không nguy hiểm: nếu đó là người thật, script chạy được và có tương tác sẽ **tự gỡ
cờ bot** (xem `handleBeacon`). Hệ thống luôn ưu tiên bằng chứng hành vi hơn lời tự khai.

Về bảo mật: `/api/pulse` không cần đăng nhập (người xem lạ mới là đối tượng ghi), nên nó
chỉ `UPDATE` đúng hàng có `vid` khớp — không bao giờ `INSERT`, và `vid` phải đúng dạng UUID do
Worker sinh ra. Mọi trường đều bị chặn độ dài và ép kiểu; `human`/`dwell`/`scroll` chỉ đi lên
bằng `MAX()` nên báo cáo gửi lúc đóng tab không kéo tụt kết quả đã có.

### Cài đặt lần đầu

```bash
npx wrangler d1 migrations apply phamkhanhminhman --remote
```

Chỉ cần một lần (và mỗi khi có file mới trong `migrations/`) — push code **không** tự chạy
migration. Đăng nhập bằng đúng mật khẩu của `/admin`. Nếu trang báo thiếu bảng `visits` thì
chạy lại lệnh migration ở trên.

## Giấy phép

© 2026 phamkhanhminhman.com. All rights reserved.
