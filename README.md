# PKMM.ONLINE - Portfolio & Blog

Trang web cá nhân và tài liệu mã nguồn mở của **Phạm Khánh Minh Mẫn** — xây dựng bằng **Next.js 16.2.6 (App Router)**, **Tailwind CSS v4**, **TypeScript 5** và xuất bản dưới dạng **Static Export (HTML/CSS/JS)** lên **Cloudflare Pages**. Giao diện được thiết kế theo phong cách báo chí học thuật (academic-editorial) sang trọng tối giản.

🌐 **Website:** [
pkmm-online.phamkhanhminhman97.workers.dev](
pkmm-online.phamkhanhminhman97.workers.dev)

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

Nếu bạn chưa tạo repo trên GitHub, hãy tạo một repo trống tên `pkmm.online` và chạy lệnh sau ở thư mục local để push code:

```bash
git init
git add .
git commit -m "feat: init portfolio website"
git branch -M main
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/pkmm.online.git
git push -u origin main
```
*(Thay thế `YOUR_GITHUB_USERNAME` bằng username GitHub của bạn).*

### Bước 2: Kết nối Cloudflare Pages với GitHub

1. Truy cập vào **Cloudflare Dashboard**.
2. Chọn **Workers & Pages** ở menu bên trái.
3. Nhấp vào nút **Create Application**, sau đó chọn tab **Pages**.
4. Chọn **Connect to Git** và liên kết với tài khoản GitHub của bạn.
5. Chọn repository `pkmm.online` mà bạn vừa push code lên.

### Bước 3: Cấu hình Build Settings trên Cloudflare

Tại trang cấu hình deploy, bạn điền các thông tin sau:
- **Project name:** `pkmm-online` (hoặc tùy bạn đặt).
- **Production branch:** `main`.
- **Framework preset:** Chọn **Next.js (Static HTML Export)**.
- **Build command:** `npm run build`.
- **Build output directory:** `out`.
- **Environment variables (Tùy chọn nếu build lỗi Node cũ):**
  - Thêm một biến: `NODE_VERSION` = `20` (hoặc cao hơn).

Nhấp vào **Save and Deploy**. Cloudflare sẽ mất khoảng 1-2 phút để build và cấp cho bạn một domain chạy thử miễn phí dạng `*.pages.dev`.

### Bước 4: Trỏ Custom Domain `pkmm.online` về Cloudflare Pages

1. Tại dashboard dự án Pages vừa tạo, chuyển sang tab **Custom Domains**.
2. Nhấp vào **Set up a custom domain**.
3. Nhập tên miền của bạn: `pkmm.online` và làm theo các bước tiếp theo.
4. Cloudflare sẽ tự động cập nhật các bản ghi DNS cần thiết (CNAME trỏ về Pages của bạn) và kích hoạt SSL (HTTPS) hoàn toàn miễn phí.

---

## Trang quản trị bài viết (`/admin`)

Ẩn bài, ghim bài và đổi thứ tự hiển thị **ngay trên pkmm.online**, không cần build
lại và không cần deploy lại. Sửa tiêu đề hay nội dung thì vẫn phải sửa
`src/data/blog.tsx` rồi deploy — xem "Vì sao không sửa nội dung ở đây" bên dưới.

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

Thân bài là JSX trong `src/data/blog.tsx` — bảng nhiều màu, khối code, chú thích
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

## Giấy phép

© 2026 PKMM.ONLINE. All rights reserved.
