import React from "react";
import katex from "katex";

interface MathProps {
  math: string;
  block?: boolean;
  className?: string;
}

/**
 * Render LaTeX math expressions statically at build time using KaTeX.
 * Safe for Next.js static export with zero client-side JavaScript execution overhead.
 */
export function Math({ math, block = false, className = "" }: MathProps) {
  const html = katex.renderToString(math, {
    displayMode: block,
    throwOnError: false,
  });

  if (block) {
    return (
      <div
        className={`my-4 py-3 px-4 bg-[#fcfcfc] border border-zinc-200 rounded-lg overflow-x-auto text-center ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-math ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function InlineMath({ math, className = "" }: { math: string; className?: string }) {
  return <Math math={math} block={false} className={className} />;
}

export function BlockMath({ math, className = "" }: { math: string; className?: string }) {
  return <Math math={math} block={true} className={className} />;
}
