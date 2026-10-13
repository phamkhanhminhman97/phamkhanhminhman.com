"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { COPY_BUTTON_CLASS, COPY_RESET_MS, copyToClipboard, type CopyState } from "@/lib/clipboard";

interface CodeBlockProps {
  code: string;
  /** Padding của khối, mặc định p-4. */
  className?: string;
  /**
   * Khối một dòng ở khung hẹp (Quick Install): nút nằm cạnh lệnh thay vì đè
   * lên nó, và lệnh được xuống dòng thay vì bị cắt sau nút.
   */
  inline?: boolean;
}

export default function CodeBlock({ code, className = "p-4", inline = false }: CodeBlockProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((await copyToClipboard(code)) ? "copied" : "failed");
    timerRef.current = setTimeout(() => setState("idle"), COPY_RESET_MS);
  };

  const button = (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy code"
      className={`${COPY_BUTTON_CLASS} ${inline ? "" : "absolute top-2 right-2 z-10"}`}
    >
      {state === "copied" ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : state === "failed" ? (
        <X className="w-3 h-3 text-red-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      <span
        aria-live="polite"
        className={`${inline ? "sr-only" : ""} ${state === "copied" ? "text-emerald-400" : state === "failed" ? "text-red-400" : ""}`}
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Failed" : "Copy"}
      </span>
    </button>
  );

  if (inline) {
    return (
      <div className={`group flex items-start gap-2 bg-zinc-900 rounded-lg ${className}`}>
        <pre className="flex-1 min-w-0 text-zinc-100 font-mono text-xs leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
          <code>{code}</code>
        </pre>
        {button}
      </div>
    );
  }

  // pt-9 chừa chỗ cho nút ở góc trên phải để dòng đầu không bị che, mà không
  // làm hẹp chiều ngang (pr-16 trước đây sinh thêm thanh cuộn ngang).
  return (
    <div className="relative group">
      {button}
      <pre className={`bg-zinc-900 text-zinc-100 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed ${className} pt-9`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

