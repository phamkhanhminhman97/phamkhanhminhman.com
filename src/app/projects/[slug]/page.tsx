import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ExternalLink,
  BookOpen,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { npmPackages, getPackageBySlug, getRelatedPackages, getBlogSlugForPackage } from "@/data/projects";
import { blogPosts } from "@/data/blog";
import NpmStatsCard from "@/components/NpmStatsCard";

// ─── Static Generation ──────────────────────────────────────────────────────

export async function generateStaticParams() {
  return npmPackages.map((pkg) => ({
    slug: pkg.id,
  }));
}

// ─── Dynamic Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = getPackageBySlug(slug);

  if (!pkg) {
    return { title: "Project Not Found" };
  }

  return {
    title: pkg.name,
    description: pkg.description,
    openGraph: {
      title: pkg.name,
      description: pkg.description,
      type: "website",
    },
  };
}

// ─── GitHub Icon SVG ────────────────────────────────────────────────────────

const GithubSvg = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = getPackageBySlug(slug);

  if (!pkg) {
    notFound();
  }

  const relatedPackages = getRelatedPackages(pkg.id, 3);
  const blogSlug = getBlogSlugForPackage(pkg.id);
  const relatedBlogPost = blogSlug
    ? blogPosts.find((post) => post.slug === blogSlug)
    : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 font-sans selection:bg-zinc-200">
      {/* ── HEADER NAV ── */}
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-mono font-bold tracking-wider text-zinc-600 hover:text-black uppercase"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
          pkmm.online / projects
        </span>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── LEFT: CONTENT (8 cols) ── */}
        <article className="lg:col-span-8">

          {/* Package Hero */}
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 pb-6 border-b border-zinc-300">
            <div className="p-3 border border-zinc-200 rounded-lg bg-white shadow-xs shrink-0">
              {pkg.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                <h1 className="font-sans font-black text-xl md:text-2xl text-zinc-950">
                  {pkg.name}
                </h1>
                <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                  {pkg.tag}
                </span>
              </div>
              <code className="inline-block font-mono text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded mb-2">
                npm i {pkg.npmName}
              </code>
              <p className="font-serif-body text-[14px] text-zinc-700 leading-relaxed mt-1">
                {pkg.longDescription}
              </p>
            </div>
          </div>

          {/* Features List */}
          <section className="mb-8">
            <h2 className="font-mono font-bold text-xs tracking-wider text-black border-b border-zinc-400 pb-1 mb-3 uppercase">
              Key Features
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {pkg.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 font-serif-body text-[14px] text-zinc-700"
                >
                  <span className="text-emerald-600 mt-1 shrink-0">◆</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Code Examples */}
          <section className="mb-8">
            <h2 className="font-mono font-bold text-xs tracking-wider text-black border-b border-zinc-400 pb-1 mb-3 uppercase">
              Code Examples
            </h2>
            <div className="space-y-6">
              {pkg.codeExamples.map((example, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                    <h3 className="font-sans font-bold text-sm text-zinc-800">
                      {example.title}
                    </h3>
                  </div>
                  <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* Links */}
          <section className="mb-8">
            <h2 className="font-mono font-bold text-xs tracking-wider text-black border-b border-zinc-400 pb-1 mb-3 uppercase">
              Resources
            </h2>
            <div className="flex flex-wrap gap-3">
              <a
                href={pkg.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-mono text-xs font-bold px-3 py-2 rounded hover:bg-zinc-700 transition-colors"
              >
                <GithubSvg className="w-3.5 h-3.5" /> GitHub Repository
              </a>
              <a
                href={pkg.npmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-red-600 text-white font-mono text-xs font-bold px-3 py-2 rounded hover:bg-red-500 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> npm Registry
              </a>
              <a
                href={pkg.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-zinc-300 font-mono text-xs font-bold px-3 py-2 rounded hover:bg-zinc-100 transition-colors text-zinc-800"
              >
                <BookOpen className="w-3.5 h-3.5" /> Full Documentation
              </a>
            </div>
          </section>

          {/* Related Blog Post */}
          {relatedBlogPost && (
            <section className="border border-zinc-200 rounded-lg p-4 bg-[#fcfcfc]">
              <h3 className="font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Related Article
              </h3>
              <Link
                href={`/blog/${relatedBlogPost.slug}`}
                className="flex items-start justify-between group"
              >
                <div>
                  <h4 className="font-sans font-bold text-sm text-zinc-900 group-hover:text-red-700 transition-colors">
                    {relatedBlogPost.title}
                  </h4>
                  <p className="font-serif-body text-xs text-zinc-600 mt-0.5">
                    {relatedBlogPost.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 mt-1 shrink-0 group-hover:text-red-700 transition-colors" />
              </Link>
            </section>
          )}

          {/* Footer Nav */}
          <div className="editorial-border-double mt-10 py-4 flex justify-between items-center text-xs font-mono text-zinc-500">
            <span>{pkg.name} — {pkg.tag}</span>
            <Link href="/" className="underline hover:text-black">
              Trở về Trang chủ
            </Link>
          </div>
        </article>

        {/* ── RIGHT: SIDEBAR (4 cols) ── */}
        <aside className="lg:col-span-4 lg:border-l lg:border-zinc-200 lg:pl-6 space-y-8">

          {/* Npm Stats */}
          <NpmStatsCard npmName={pkg.npmName} defaultDownloads={pkg.defaultDownloads} />

          {/* Quick Install */}
          <section className="bg-white border border-zinc-200 rounded-lg p-4 shadow-2xs">
            <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
              Quick Install
            </h3>
            <pre className="bg-zinc-900 text-zinc-100 p-3 rounded font-mono text-xs overflow-x-auto">
              <code>{`npm i ${pkg.npmName}`}</code>
            </pre>
            <p className="font-mono text-[10px] text-zinc-500 mt-2">
              Requires Node.js 18 or higher
            </p>
          </section>

          {/* Related Packages */}
          <section>
            <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
              Other Packages
            </h3>
            <ul className="space-y-3">
              {relatedPackages.map((rp) => (
                <li key={rp.id}>
                  <Link
                    href={`/projects/${rp.id}`}
                    className="flex items-center gap-2 group"
                  >
                    <span className="p-1.5 border border-zinc-200 rounded bg-white shrink-0">
                      {rp.icon}
                    </span>
                    <div>
                      <span className="font-sans font-bold text-xs text-zinc-800 group-hover:text-red-700 transition-colors block leading-tight">
                        {rp.name}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-400 uppercase">
                        {rp.tag}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Support CTA */}
          <section className="border border-zinc-200 rounded-lg p-4 bg-white shadow-2xs">
            <h4 className="font-sans font-bold text-xs text-zinc-950 mb-1">
              Need Integration Help?
            </h4>
            <p className="font-serif-body text-[11.5px] text-zinc-600 leading-relaxed mb-3">
              Nếu doanh nghiệp của bạn cần xây dựng giải pháp đồng bộ tự động đơn hàng với các sàn thương mại điện tử, hãy liên hệ để trao đổi.
            </p>
            <a
              href="mailto:phamkhanhminhman97@gmail.com"
              className="inline-block bg-black text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors uppercase text-center w-full"
            >
              Gửi email trực tiếp
            </a>
          </section>

        </aside>
      </div>
    </div>
  );
}
