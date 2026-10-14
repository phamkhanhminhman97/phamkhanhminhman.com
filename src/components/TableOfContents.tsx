"use client";

import React, { useEffect, useState } from "react";
import { ListOrdered, ChevronDown } from "lucide-react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface TableOfContentsProps {
  mode?: "desktop" | "mobile" | "both";
}

export default function TableOfContents({
  mode = "both",
}: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let handleScroll: (() => void) | null = null;

    const frameId = requestAnimationFrame(() => {
      const container = document.getElementById("article-content");
      if (!container) return;

      const headings = Array.from(
        container.querySelectorAll<HTMLHeadingElement>("h2, h3")
      );

      if (headings.length < 2) return;

      const idCounts = new Map<string, number>();
      const parsedItems: TocItem[] = [];

      headings.forEach((heading) => {
        const rawText = heading.textContent?.trim() || "";
        if (!rawText) return;

        let uniqueId = heading.dataset.tocId || heading.id;
        if (!uniqueId) {
          const baseId = slugify(rawText) || "section";
          const count = idCounts.get(baseId) || 0;
          idCounts.set(baseId, count + 1);
          uniqueId = count === 0 ? baseId : `${baseId}-${count}`;
          heading.id = uniqueId;
          heading.dataset.tocId = uniqueId;
        }

        heading.classList.add("scroll-mt-12");

        parsedItems.push({
          id: uniqueId,
          text: rawText,
          level: heading.tagName.toLowerCase() === "h2" ? 2 : 3,
        });
      });

      setItems(parsedItems);

      // Id vừa được gán ở trên khi tiêu đề nằm trong component tự viết (server
      // không gán được). Trình duyệt đã bỏ lỡ neo lúc tải trang, nên cuộn tới đó
      // ngay. Nếu id đã có từ HTML tĩnh thì trình duyệt cuộn rồi, scrollY > 0.
      if (window.location.hash && window.scrollY < 8) {
        try {
          document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
        } catch {
          // Hash không giải mã được: bỏ qua, không phải neo hợp lệ.
        }
      }

      if (parsedItems.length > 0) {
        setActiveId(parsedItems[0].id);
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        {
          rootMargin: "-80px 0% -65% 0%",
          threshold: 0,
        }
      );

      headings.forEach((h) => observer?.observe(h));

      handleScroll = () => {
        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 60
        ) {
          if (parsedItems.length > 0) {
            setActiveId(parsedItems[parsedItems.length - 1].id);
          }
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      if (handleScroll) window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (items.length < 2) return null;

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", `#${id}`);
      setActiveId(id);
      setMobileOpen(false);
    }
  };

  const showMobile = mode === "mobile" || mode === "both";
  const showDesktop = mode === "desktop" || mode === "both";

  return (
    <>
      {/* ── MOBILE COLLAPSIBLE TOC (Hiện trên màn hình nhỏ < lg, đặt trước bài viết) ── */}
      {showMobile && (
        <div className="lg:hidden mb-6 border border-zinc-200 rounded-lg bg-[#fcfcfc] overflow-hidden text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-toc-nav"
            className="w-full flex items-center justify-between p-3 font-mono font-bold text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <ListOrdered className="w-3.5 h-3.5 text-red-700" />
              <span>Table of Contents ({items.length})</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                mobileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {mobileOpen && (
            <nav
              id="mobile-toc-nav"
              aria-label="Mobile table of contents"
              className="p-3 pt-0 border-t border-zinc-200 max-h-72 overflow-y-auto space-y-1 font-sans"
            >
              {items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleLinkClick(e, item.id)}
                    className={`block py-1 transition-colors leading-snug ${
                      item.level === 3 ? "pl-3 text-[11.5px]" : "pl-1 text-[12px]"
                    } ${
                      isActive
                        ? "text-red-700 font-bold border-l-2 border-red-700 pl-2 bg-red-50/70 rounded-r"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    {item.text}
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      )}

      {/* ── DESKTOP STICKY TOC (Sidebar trên màn hình lg) ── */}
      {showDesktop && (
        <section
          aria-label="Table of contents"
          className="hidden lg:block sticky top-6 bg-[#fcfcfc] border border-zinc-200 p-4 rounded-lg shadow-2xs max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5 mb-3">
            <h3 className="font-mono font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-red-700" />
              <span>Contents</span>
            </h3>
            <span className="font-mono text-[10px] text-zinc-400">
              {items.length} sections
            </span>
          </div>

          <nav
            aria-label="Table of contents"
            className="space-y-1 font-sans text-[12px] leading-snug"
          >
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleLinkClick(e, item.id)}
                  className={`block py-1 transition-all ${
                    item.level === 3 ? "pl-3 text-[11.5px]" : ""
                  } ${
                    isActive
                      ? "text-red-700 font-semibold border-l-2 border-red-700 pl-2 -ml-2 bg-red-50/70 rounded-r"
                      : "text-zinc-600 hover:text-black hover:border-l-2 hover:border-zinc-300 hover:pl-2 hover:-ml-2"
                  }`}
                >
                  <span className="line-clamp-2">{item.text}</span>
                </a>
              );
            })}
          </nav>
        </section>
      )}
    </>
  );
}
