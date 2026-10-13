"use client";

import { useEffect, useRef } from "react";
import { COPY_BUTTON_CLASS, COPY_RESET_MS, copyToClipboard, type CopyState } from "@/lib/clipboard";

// Icon lucide (copy, check, x), viết một lần để trạng thái nào cũng dùng đúng một path.
const SVG_OPEN =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICONS: Record<CopyState, string> = {
  idle: SVG_OPEN + '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  copied: SVG_OPEN + '<path d="M20 6 9 17l-5-5"/></svg>',
  failed: SVG_OPEN + '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
};
const LABELS: Record<CopyState, string> = { idle: "Copy", copied: "Copied", failed: "Failed" };
const COLORS: Record<CopyState, string> = { idle: "", copied: "text-emerald-400", failed: "text-red-400" };

function render(btn: HTMLButtonElement, state: CopyState) {
  const color = COLORS[state];
  btn.innerHTML =
    (color ? '<span class="' + color + '">' + ICONS[state] + "</span>" : ICONS[state]) +
    '<span aria-live="polite"' + (color ? ' class="' + color + '"' : "") + ">" + LABELS[state] + "</span>";
}

/**
 * Tự động gắn nút "Copy code" cho các thẻ <pre> bên trong bài viết
 * mà không cần phải can thiệp sửa trực tiếp từng file JSX trong posts/.
 */
export default function CodeBlockEnhancer({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const timers = new Set<number>();

    container.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
      // Effect chạy hai lần ở dev (StrictMode): khối đã bọc thì bỏ qua.
      if (pre.parentElement?.classList.contains("has-copy-btn")) return;

      // Chừa chỗ phía trên cho nút để dòng đầu không bị che. Không dùng pr-16:
      // nó làm hẹp mọi dòng và sinh thanh cuộn ngang ở 13/73 khối code.
      pre.classList.add("pt-9");

      const wrapper = document.createElement("div");
      wrapper.className = "relative group has-copy-btn";
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn absolute top-2 right-2 z-10 " + COPY_BUTTON_CLASS;
      btn.setAttribute("aria-label", "Copy code");
      render(btn, "idle");

      let timer: number | null = null;
      btn.addEventListener("click", async () => {
        const text = pre.querySelector("code")?.innerText || pre.innerText;
        render(btn, (await copyToClipboard(text)) ? "copied" : "failed");
        if (timer !== null) {
          window.clearTimeout(timer);
          timers.delete(timer);
        }
        timer = window.setTimeout(() => render(btn, "idle"), COPY_RESET_MS);
        timers.add(timer);
      });

      wrapper.appendChild(btn);
    });

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
}

