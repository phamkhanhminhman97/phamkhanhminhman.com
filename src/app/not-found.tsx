import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 font-sans selection:bg-zinc-200">
      <div className="text-center">
        {/* Error code */}
        <h1 className="text-[120px] md:text-[180px] font-bold font-serif text-zinc-200 leading-none select-none">
          404
        </h1>

        <div className="-mt-8 md:-mt-12 mb-8">
          <h2 className="text-xl md:text-2xl font-sans font-bold text-zinc-900">
            Page not found
          </h2>
          <p className="font-serif-body text-[15px] text-zinc-600 mt-2 max-w-md mx-auto leading-relaxed">
            This page may have been moved, deleted, or never existed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-sans rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-zinc-300 text-zinc-700 text-sm font-sans rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            About
          </Link>
        </div>

        {/* Decorative line */}
        <div className="editorial-border-double max-w-xs mx-auto mt-12" />
      </div>
    </div>
  );
}
