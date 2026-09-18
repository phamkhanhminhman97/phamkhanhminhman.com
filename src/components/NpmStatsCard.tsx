"use client";

import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { fetchNpmStats } from "@/lib/npm-stats";

interface NpmStatsCardProps {
  npmName: string;
}

export default function NpmStatsCard({ npmName }: NpmStatsCardProps) {
  const [downloads, setDownloads] = useState<number | null>(null);
  /**
   * Phiên bản hiện tại trên npm.
   *
   * Trang này là server component xuất tĩnh, nên số phiên bản không thể lấy
   * lúc build mà không làm nó cũ đi ngay sau lần publish kế tiếp. Card này
   * vốn đã là client component và đã gọi npm, nên đây là chỗ rẻ nhất để hiện
   * một con số luôn đúng.
   */
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const stats = await fetchNpmStats([npmName]);
        if (cancelled) return;
        const n = stats.downloads[npmName];
        if (typeof n === "number") setDownloads(n);
        if (stats.versions[npmName]) setVersion(stats.versions[npmName]);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [npmName]);

  return (
    <section className="bg-[#fcfcfc] border border-zinc-200 p-4 rounded-lg">
      <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
        Download Stats
      </h3>
      <div className="flex items-center gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-full p-2">
          <Download className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <span className="block font-sans font-black text-2xl text-zinc-950">
            {loading ? (
              <span className="text-zinc-300 animate-pulse">---</span>
            ) : downloads === null ? (
              /* Không lấy được thì nói thẳng là không có số, KHÔNG rơi về một
                 hằng số gõ tay: người đọc không phân biệt được số thật với số
                 dự phòng, nên số dự phòng chỉ tạo ra niềm tin sai. */
              <span className="text-zinc-400 text-base">—</span>
            ) : (
              downloads.toLocaleString()
            )}
          </span>
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Downloads / Last Week
          </span>
        </div>
      </div>
      <div className="mt-3 font-mono text-[10px] text-zinc-400">
        {version ? `Latest v${version} · ` : ""}Source: npm Registry API
      </div>
    </section>
  );
}
