import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notesPosts } from "@/data/blog";
import { formatDate } from "@/lib/date";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { SITE_URL, SITE_DOMAIN } from "@/lib/site";
import { profile } from "@/data/profile";
import { ArrowLeft, Calendar, Clock, BookOpen } from "lucide-react";

export const dynamic = "force-static";

const d = copy;
const t = d.notes;

export const metadata: Metadata = {
  title: { absolute: `${t.metaTitle} — ${profile.name}` },
  description: t.metaDescription,
  alternates: alternatesFor("/notes"),
  openGraph: {
    ...openGraphFor("/notes", t.metaTitle, t.metaDescription),
    type: "website",
  },
};

export default function NotesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE_URL}/notes#collection`,
            url: `${SITE_URL}/notes`,
            name: t.metaTitle,
            description: t.metaDescription,
            inLanguage: "en",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: profile.name,
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Study Notes",
                  item: `${SITE_URL}/notes`,
                },
              ],
            },
          }),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 font-sans selection:bg-zinc-200">
        {/* Navigation header */}
        <header className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-mono font-bold tracking-wider text-zinc-600 hover:text-black uppercase"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {d.nav.backToHome}
          </Link>
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
            {SITE_DOMAIN} / notes
          </span>
        </header>

        {/* Section title & Academic intro */}
        <div className="mb-10 pb-6 border-b border-zinc-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded bg-zinc-100 text-zinc-700">
              <BookOpen className="w-4 h-4" />
            </span>
            <p className="font-mono text-xs font-bold tracking-widest uppercase text-red-700">
              {t.heading}
            </p>
          </div>
          <h1 className="font-serif-body font-black text-3xl md:text-4xl text-zinc-950 mb-3 tracking-tight">
            Curated Study Notes &amp; Verifications
          </h1>
          <p className="font-serif-body text-base text-zinc-600 leading-relaxed max-w-2xl">
            {t.subheading}
          </p>

          <div className="mt-4 p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-serif-body text-zinc-600 leading-relaxed">
            <span className="font-sans font-bold text-zinc-800 uppercase tracking-wide text-[10px] block mb-1">
              Scope &amp; Commitment
            </span>
            {t.disclaimer}
          </div>
        </div>

        {/* Notes listing */}
        {notesPosts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-300 rounded-lg text-zinc-500 font-mono text-xs">
            {t.emptyNotice}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {notesPosts.map((post) => (
              <li key={post.slug} className="py-6 first:pt-0 last:pb-0">
                <article>
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-zinc-500 uppercase tracking-wide">
                    <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded text-[10px] text-red-700 font-semibold">
                      {post.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(post.date)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>

                  <h2 className="font-serif-body font-bold text-xl md:text-2xl text-zinc-950 hover:text-red-700 transition-colors mb-2">
                    <Link href={`/notes/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="font-serif-body text-sm text-zinc-700 leading-relaxed">
                    {post.description}
                  </p>

                  <div className="mt-3">
                    <Link
                      href={`/notes/${post.slug}`}
                      className="font-mono text-xs font-bold text-zinc-900 hover:text-red-700 inline-flex items-center gap-1 uppercase"
                    >
                      Read note &rarr;
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
