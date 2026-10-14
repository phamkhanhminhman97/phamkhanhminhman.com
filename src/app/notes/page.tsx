import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import NotesList from "@/components/NotesList";
import { notesPosts } from "@/data/blog/notes";
import { toSummary } from "@/data/blog/types";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { SITE_URL, SITE_DOMAIN } from "@/lib/site";
import { profile } from "@/data/profile";
import { ArrowLeft, BookOpen } from "lucide-react";

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
                  name: t.breadcrumb,
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
            {t.pageTitle}
          </h1>
          <p className="font-serif-body text-base text-zinc-600 leading-relaxed max-w-2xl">
            {t.subheading}
          </p>

          <div className="mt-4 p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-serif-body text-zinc-600 leading-relaxed">
            <span className="font-sans font-bold text-zinc-800 uppercase tracking-wide text-[10px] block mb-1">
              {t.scopeLabel}
            </span>
            {t.disclaimer}
          </div>
        </div>

        {/* Notes listing (client component: áp trạng thái ẩn / ghim từ Worker) */}
        <NotesList posts={notesPosts.map(toSummary)} />
      </div>
    </>
  );
}
