# phamkhanhminhman.com - Portfolio & Blog

Trang web cá nhân và tài liệu mã nguồn mở của **Phạm Khánh Minh Mẫn** — xây dựng bằng **Next.js 16.2.6 (App Router)**, **Tailwind CSS v4**, **TypeScript 5** và xuất bản dưới dạng **Static Export (HTML/CSS/JS)** lên **Cloudflare Pages**. Giao diện được thiết kế theo phong cách báo chí học thuật (academic-editorial) sang trọng tối giản.

🌐 **Website:** [phamkhanhminhman.com](https://phamkhanhminhman.com)

---

## Tính Năng Nổi Bật

- **📄 Project Detail Pages:** 4 trang chi tiết cho từng thư viện npm (Shopee, TikTok, Lazada, All-in-One) với code examples, số liệu thống kê downloads, và hướng dẫn cài đặt nhanh.
- **👤 About / CV Page:** Trang giới thiệu cá nhân với timeline kinh nghiệm làm việc, kỹ năng, học vấn.
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
- **⚡ Static Export siêu nhẹ:** Toàn bộ website là file tĩnh, lý tưởng cho Cloudflare Pages (tải trang siêu nhanh, 0% RAM server, bảo mật tuyệt đối).
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

Dự án này là **Worker chỉ có static assets** (`wrangler.jsonc` có `assets`, không có `main`).
Dashboard sẽ báo:

> *"Variables cannot be added to a Worker that only has static assets."*

**Đúng, và không sao cả** — vì `NEXT_PUBLIC_*` là biến **LÚC BUILD**, không phải lúc chạy.
Nó bị nhúng thẳng vào file JS khi `next build`. Biến runtime của Cloudflare **không bao giờ**
dùng được cho nó, kể cả nếu dashboard có cho thêm.

Kiểm chứng:

```bash
NEXT_PUBLIC_WEB3FORMS_KEY= npm run build && grep -rl "<key>" out/   # -> 0 file
npm run build                            && grep -rl "<key>" out/   # -> 1 file
```

**Hai đường deploy, chọn một:**

| | Cần làm gì |
|---|---|
| **Build ở máy** *(khuyến nghị — đơn giản nhất)* | `npm run deploy` — build tại chỗ với `.env.local` rồi `wrangler deploy`. Cloudflare chỉ phục vụ file tĩnh, **không cần cấu hình biến gì cả** |
| **Cloudflare tự build** (Git integration) | Đặt biến ở **Workers Builds → Build variables** — mục khác hẳn với *Variables and secrets* ở ảnh trên |

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

## Hướng dẫn Triển khai lên Cloudflare Pages (Git Integration)

Khi bạn đẩy code lên GitHub, Cloudflare Pages sẽ tự động nhận diện thay đổi, build và deploy website của bạn lên mạng lưới CDN toàn cầu của họ.

### Bước 1: Đẩy mã nguồn lên GitHub

Nếu bạn chưa tạo repo trên GitHub, hãy tạo một repo trống tên `phamkhanhminhman.com` và chạy lệnh sau ở thư mục local để push code:

```bash
git init
git add .
git commit -m "feat: init portfolio website"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/phamkhanhminhman.com.git
git push -u origin main
```
*(Thay thế `YOUR_GITHUB_USERNAME` bằng username GitHub của bạn).*

### Bước 2: Kết nối Cloudflare Pages với GitHub

1. Truy cập vào **Cloudflare Dashboard**.
2. Chọn **Workers & Pages** ở menu bên trái.
3. Nhấp vào nút **Create Application**, sau đó chọn tab **Pages**.
4. Chọn **Connect to Git** và liên kết với tài khoản GitHub của bạn.
5. Chọn repository `phamkhanhminhman.com` mà bạn vừa push code lên.

### Bước 3: Cấu hình Build Settings trên Cloudflare

Tại trang cấu hình deploy, bạn điền các thông tin sau:
- **Project name:** `phamkhanhminhman` (hoặc tùy bạn đặt).
- **Production branch:** `main`.
- **Framework preset:** Chọn **Next.js (Static HTML Export)**.
- **Build command:** `npm run build`.
- **Build output directory:** `out`.
- **Environment variables (Tùy chọn nếu build lỗi Node cũ):**
  - Thêm một biến: `NODE_VERSION` = `20` (hoặc cao hơn).

Nhấp vào **Save and Deploy**. Cloudflare sẽ mất khoảng 1-2 phút để build và cấp cho bạn một domain chạy thử miễn phí dạng `*.pages.dev`.

### Bước 4: Trỏ Custom Domain `phamkhanhminhman.com` về Cloudflare Pages

1. Tại dashboard dự án Pages vừa tạo, chuyển sang tab **Custom Domains**.
2. Nhấp vào **Set up a custom domain**.
3. Nhập tên miền của bạn: `phamkhanhminhman.com` và làm theo các bước tiếp theo.
4. Cloudflare sẽ tự động cập nhật các bản ghi DNS cần thiết (CNAME trỏ về Pages của bạn) và kích hoạt SSL (HTTPS) hoàn toàn miễn phí.

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
# 1. Deploy — lần đầu wrangler tự tạo KV namespace và ghi id vào wrangler.jsonc
npm run deploy

# 2. Đặt mật khẩu đăng nhập (wrangler sẽ hỏi, không gõ vào dòng lệnh)
npx wrangler secret put ADMIN_PASSWORD

# 3. Đặt khoá ký cookie phiên — dùng một chuỗi ngẫu nhiên dài, KHÔNG trùng mật khẩu
npx wrangler secret put SESSION_SECRET

# 4. Deploy lại để Worker nhận secret
npm run deploy
```

Sau bước 1, **commit lại `wrangler.jsonc`** vì wrangler đã ghi `id` của KV vào đó.

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

Xem IP, vị trí và nhà mạng của những người đã ghé trang.

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
| `human = 1` | Trình duyệt thật | JavaScript chạy được, đọc ra được màn hình và card đồ hoạ |
| `human = 2` | **Người thật** | Có cuộn / bấm / ở lại trên 15 giây |

Mức 2 là thứ máy quét gần như không giả được: phải vừa chạy JavaScript vừa có hành vi.

Script cũng lấp những chỗ Cloudflare không biết: tên chip đồ hoạ qua WebGL (nói được đời
máy khi User-Agent đã giấu), tên máy qua Client Hints, độ phân giải, số nhân CPU, RAM,
múi giờ trình duyệt. **Múi giờ trình duyệt lệch với múi giờ theo IP là dấu hiệu VPN** —
trang quản trị gắn nhãn `VPN?` cho trường hợp đó.

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

**Đời máy suy từ độ phân giải, không từ chuỗi nhận dạng.** Trên iOS thì:

- WebGL trả về đúng chuỗi `"Apple GPU"` cho mọi máy — đã kiểm chứng, vô dụng để phân biệt.
- Client Hints (thứ cho ra `"Pixel 8"` trên Android) thì Apple không hỗ trợ.
- Chuỗi nhận dạng chỉ nói `"iPhone"`, không nói đời nào.

Còn lại độ phân giải logic — thứ không nói dối được vì nó là kích thước thật của màn hình.
Bảng `SCREENS` tra ra `390x844@3 → "iPhone 12/13/14"`. Không tách được các máy dùng chung một
cỡ màn, nên trả về cả nhóm thay vì đoán bừa một cái tên.

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

### Máy tính: đọc chip, không đọc màn hình

Một lượt thử trên MacBook M4 lộ ra bốn chỗ sai của vòng trước:

| Chỗ sai | Nguyên nhân | Đã sửa |
| --- | --- | --- |
| "Đời máy: —" | Bảng `SCREENS` chỉ có điện thoại | Máy tính suy từ chip: `"Apple M4"` → `"Mac (M4)"` |
| "Hệ điều hành: 27.0.0" trần | Không ghép tên hệ | Hiện `"macOS 27"` |
| "4G / Wi-Fi nhanh" trên máy bàn | `effectiveType` **không** nói loại kết nối vật lý | Đổi nhãn thành tốc độ: `"10.0 Mbps · nhanh"` |
| Gắn cờ `VPN?` nhầm | Chỉ so TÊN múi giờ | So ĐỘ LỆCH GIỜ thật, đổi nhãn thành `"Lệch giờ"` |

Hai bài học chung:

- **Độ phân giải vô dụng trên máy tính.** Máy thật cho `1334x1000@2` — không khớp MacBook nào,
  vì đó là màn ngoài hoặc màn đã chia tỉ lệ. Ngược lại chip thì chỉ có một nghĩa. Nên
  `guessModel()` thử chip trước, rồi mới tới bảng độ phân giải (dành cho điện thoại).
- **Mac và Windows cũng đóng băng phiên bản trong chuỗi nhận dạng**, y như Safari trên iOS:
  Mac vĩnh viễn khai `"Mac OS X 10_15_7"` (từ 2020), Windows 11 vẫn khai `"Windows NT 10.0"`.
  Chỉ Client Hints nói thật, nên nó được ưu tiên tuyệt đối.

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

Bốn lượt thử trên máy thật, đối chiếu với sự thật do chủ máy xác nhận:

| Máy thật | Độ phân giải | Hệ thống đoán | Đúng? |
| --- | --- | --- | --- |
| iPhone 12, Chrome, iOS 27 | `390x844@3` | iPhone 12/13/14 · iOS 27 | ✅ |
| iPhone 12, Safari, iOS 27 | `390x844@3` | iPhone 12/13/14 · iOS 27 | ✅ |
| iPhone 11, Safari, iOS 27 | `414x896@2` | iPhone XR/11 · iOS 27 | ✅ |
| Mac mini M4, Chrome, macOS 27 | `1334x1000@2` (màn ngoài) | Mac (M4) · macOS 27 | ✅ |

Mac mini là ví dụ rõ nhất cho việc **không được suy đời máy tính từ độ phân giải**: máy này
không có màn hình tích hợp, con số đo được hoàn toàn là của màn ngoài cắm vào.

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
npm run deploy
```

Đăng nhập bằng đúng mật khẩu của `/admin`. Nếu trang báo thiếu bảng `visits` thì chạy lại lệnh
migration ở trên.

## Giấy phép

© 2026 phamkhanhminhman.com. All rights reserved.
