"use client";

import React from "react";
import { SITE_DOMAIN } from "@/lib/site";

/**
 * Trang quản trị bài viết.
 *
 * Static export không có server, nên trang này là HTML tĩnh + React chạy ở trình
 * duyệt; mọi thao tác đọc/ghi đi qua API của Worker (`/api/admin/*`), nơi giữ
 * mật khẩu và KV. Không có bí mật nào nằm trong bundle này.
 *
 * Phần THÂN bài là JSX trong `src/data/blog/posts/<slug>.tsx` — cố ý không sửa ở
 * đây: một cái form không thể round-trip JSX (bảng nhiều màu, khối code) mà
 * không có nguy cơ làm hỏng bài. Nút "Mở trong editor" đưa thẳng tới đúng file.
 */

interface Post {
  slug: string;
  date: string;
  category: string;
  title: string;
}

interface Meta {
  hidden: boolean;
  pinned: boolean;
  order: number | null;
}

type MetaMap = Record<string, Meta>;

const EMPTY: Meta = { hidden: false, pinned: false, order: null };

/** Đường dẫn repo trên máy, để nút mở editor hoạt động khi bạn xem từ laptop. */
const REPO = "/Users/man/Documents/lvthacsi/pkmm.online";

export default function AdminPage() {
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [meta, setMeta] = React.useState<MetaMap>({});
  const [saved, setSaved] = React.useState<MetaMap>({});
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const dirty = JSON.stringify(meta) !== JSON.stringify(saved);

  const loadAll = React.useCallback(async (alive: () => boolean = () => true) => {
    const [mRes, pRes] = await Promise.all([
      fetch("/api/admin/meta"),
      fetch("/post-manifest.json"),
    ]);
    if (!alive()) return;
    if (mRes.status === 401) {
      setAuthed(false);
      setReady(true);
      return;
    }
    if (!mRes.ok) {
      const body = await mRes.json().catch(() => ({}));
      if (!alive()) return;
      setError(body.error ?? `Lỗi ${mRes.status}`);
      setReady(true);
      return;
    }
    const { meta: m } = (await mRes.json()) as { meta: MetaMap };
    const { posts: p } = (await pRes.json()) as { posts: Post[] };
    if (!alive()) return;
    setPosts(p);
    setMeta(m);
    setSaved(m);
    setAuthed(true);
    setReady(true);
  }, []);

  // Nạp dữ liệu ban đầu. Static export không có server loader (không dùng được
  // Server Component hay Route Handler đọc request), nên effect là chỗ duy nhất
  // gọi được API. Mọi setState đều nằm SAU await và có chốt `alive` để không ghi
  // vào component đã unmount — đúng mẫu "đồng bộ với hệ thống bên ngoài".
  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

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
    await loadAll();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setMeta({});
    setSaved({});
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/meta", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meta }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Lưu thất bại (${res.status})`);
      return;
    }
    const { meta: m } = (await res.json()) as { meta: MetaMap };
    setMeta(m);
    setSaved(m);
  }

  const at = (slug: string): Meta => meta[slug] ?? EMPTY;
  const patch = (slug: string, next: Partial<Meta>) =>
    setMeta((prev) => ({ ...prev, [slug]: { ...(prev[slug] ?? EMPTY), ...next } }));

  /** Thứ tự hiển thị đúng như Worker sẽ tính, để xem trước ngay tại đây. */
  const ordered = React.useMemo(() => {
    const idx = new Map(posts.map((p, i) => [p.slug, i]));
    return [...posts].sort((a, b) => {
      const ma = at(a.slug);
      const mb = at(b.slug);
      return (
        (ma.pinned ? 0 : 1) - (mb.pinned ? 0 : 1) ||
        (ma.order ?? Number.MAX_SAFE_INTEGER) - (mb.order ?? Number.MAX_SAFE_INTEGER) ||
        (idx.get(a.slug) ?? 0) - (idx.get(b.slug) ?? 0)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, meta]);

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
        <h1 className="font-sans font-bold text-lg text-black mb-1">Quản trị bài viết</h1>
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
    <main className="max-w-4xl mx-auto px-4 py-10 font-sans">
      <header className="flex items-baseline justify-between border-b border-zinc-200 pb-4 mb-6">
        <div>
          <h1 className="font-sans font-bold text-lg text-black">Quản trị bài viết</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {posts.length} bài · thay đổi có hiệu lực ngay, không cần build lại
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={!dirty || busy}
            className="bg-black text-white text-[11px] font-mono uppercase tracking-wider px-4 py-2 rounded disabled:opacity-30"
          >
            {busy ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "Đã lưu"}
          </button>
          <button
            onClick={logout}
            className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 hover:text-black px-2 py-2"
          >
            Thoát
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <ol className="space-y-2">
        {ordered.map((post, i) => {
          const m = at(post.slug);
          return (
            <li
              key={post.slug}
              className={`border rounded-lg p-3 flex items-start gap-3 ${
                m.hidden ? "border-zinc-200 bg-zinc-50 opacity-60" : "border-zinc-200 bg-white"
              }`}
            >
              <span className="font-mono text-[11px] text-zinc-400 pt-1 w-5 shrink-0">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-sans font-bold text-[13px] text-zinc-900 leading-snug">
                  {post.title}
                </p>
                <p className="font-mono text-[10px] text-zinc-400 mt-1 uppercase">
                  {post.date} · {post.category}
                  {m.pinned && <span className="text-amber-700"> · ghim</span>}
                  {m.hidden && <span className="text-red-700"> · đang ẩn</span>}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] uppercase text-zinc-500 hover:text-black"
                  >
                    Xem
                  </a>
                  <a
                    href={`vscode://file${REPO}/src/data/blog/posts/${post.slug}.tsx`}
                    className="font-mono text-[10px] uppercase text-zinc-500 hover:text-black"
                    title="Sửa nội dung bài trong VS Code (chỉ chạy khi mở từ máy của bạn)"
                  >
                    Sửa nội dung
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  value={m.order ?? ""}
                  onChange={(e) =>
                    patch(post.slug, {
                      order: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="—"
                  title="Thứ tự: số càng nhỏ càng lên trên. Để trống = giữ vị trí gốc."
                  className="w-14 border border-zinc-300 rounded px-2 py-1 text-[11px] font-mono text-center"
                />
                <Toggle
                  on={m.pinned}
                  onClick={() => patch(post.slug, { pinned: !m.pinned })}
                  label="Ghim"
                  activeClass="bg-amber-600 text-white border-amber-600"
                />
                <Toggle
                  on={m.hidden}
                  onClick={() => patch(post.slug, { hidden: !m.hidden })}
                  label={m.hidden ? "Hiện" : "Ẩn"}
                  activeClass="bg-red-700 text-white border-red-700"
                />
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] text-zinc-500 mt-6 leading-relaxed">
        <strong>Ẩn</strong> gỡ bài khỏi trang chủ, RSS và sitemap, và trả 404 cho trang bài —
        bài không còn nằm trong HTML, không chỉ bị giấu bằng CSS.{" "}
        <strong>Ghim</strong> đẩy bài lên đầu danh sách trang chủ.{" "}
        <strong>Thứ tự</strong> sắp xếp trong cùng nhóm. Sửa tiêu đề hay nội dung thì cần sửa{" "}
        <code className="font-mono">src/data/blog/posts/&lt;slug&gt;.tsx</code> rồi deploy lại.
      </p>
    </main>
  );
}

function Toggle({
  on,
  onClick,
  label,
  activeClass,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] uppercase tracking-wider border rounded px-2.5 py-1.5 transition-colors ${
        on ? activeClass : "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}
