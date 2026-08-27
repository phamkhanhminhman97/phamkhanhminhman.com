import React from "react";
import Link from "next/link";
import { blogPosts } from "@/data/blog";
import { formatDate } from "@/lib/date";
import { copy } from "@/content/copy";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

export default function BlogArticle({
  post,
}: {
  post: (typeof blogPosts)[number];
}) {
  const d = copy;
  const Content = post.content;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 font-sans selection:bg-zinc-200">
      
      {/* Header back navigation */}
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-mono font-bold tracking-wider text-zinc-600 hover:text-black uppercase"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {d.nav.backToHome}
        </Link>
        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
          pkmm.online / blog
        </span>
      </header>

      {/* Main layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column (8 cols): Article Content */}
        <article className="lg:col-span-8">
          
          {/* Metadata */}
          <div className="flex items-center gap-2 mb-3 text-xs font-mono text-zinc-500 uppercase tracking-wide">
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

          {/* Title */}
          <h1 className="font-serif-body font-black text-2xl md:text-3xl text-zinc-950 leading-tight mb-6 pb-4 border-b border-zinc-300">
            {post.title}
          </h1>

          {/* Render article content */}
          <div className="space-y-6">
            <Content />
          </div>

          <div className="editorial-border-double mt-12 py-4 flex justify-between items-center text-xs font-mono text-zinc-500">
            <span>{post.category}</span>
            <Link href="/" className="underline hover:text-black">
              {d.nav.backToHome}
            </Link>
          </div>
        </article>

        {/* Right Column (4 cols): Sidebar info */}
        <aside className="lg:col-span-4 lg:border-l lg:border-zinc-200 lg:pl-6 space-y-8">
          
          {/* About Author */}
          <section className="bg-[#fcfcfc] border border-zinc-200 p-4 rounded-lg">
            <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-2 uppercase">
              {d.blog.author}
            </h3>
            <p className="font-sans font-bold text-sm text-zinc-900 mb-0.5">Phạm Khánh Minh Mẫn</p>
            <p className="font-mono text-[10px] text-zinc-500 mb-2">E-commerce API Developer</p>
            <p className="font-serif-body text-xs text-zinc-600 leading-relaxed">
              {d.blog.authorBio}
            </p>
          </section>

          {/* Related Articles */}
          <section>
            <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
              {d.blog.otherPosts}
            </h3>
            <ul className="space-y-3 font-sans text-xs">
              {blogPosts
                .filter((other) => other.slug !== post.slug)
                .map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/blog/${other.slug}`}
                      className="font-bold text-zinc-800 hover:text-red-700 leading-snug block transition-colors"
                    >
                      {other.title}
                    </Link>
                    <span className="font-mono text-[9px] text-zinc-400 uppercase mt-0.5 block">
                      {formatDate(other.date)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          {/* Web3Forms Context */}
          <section className="border border-zinc-200 rounded-lg p-4 bg-white shadow-2xs">
            <h4 className="font-sans font-bold text-xs text-zinc-950 mb-1">
              {d.blog.ctaTitle}
            </h4>
            <p className="font-serif-body text-[11.5px] text-zinc-600 leading-relaxed mb-3">
              {d.blog.ctaBody}
            </p>
            <a
              href="mailto:phamkhanhminhman97@gmail.com"
              className="inline-block bg-black text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors uppercase text-center w-full"
            >
              {d.blog.ctaButton}
            </a>
          </section>

        </aside>
      </main>
    </div>
  );
}
