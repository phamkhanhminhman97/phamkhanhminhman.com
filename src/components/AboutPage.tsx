import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Award,
  Briefcase,
  GraduationCap,
  Cpu,
  FlaskConical,
  Server,
} from "lucide-react";
import { profile } from "@/data/profile";
import { copy } from "@/content/copy";
import { SITE_DOMAIN } from "@/lib/site";

// ─── GitHub SVG Icon ────────────────────────────────────────────────────────

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

export default function AboutPage() {
  const d = copy;
  const t = d.about;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 font-sans selection:bg-zinc-200">
      {/* ── HEADER NAV ── */}
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-mono font-bold tracking-wider text-zinc-600 hover:text-black uppercase"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {d.nav.backToHome}
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
            {t.breadcrumb}
          </span>
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ── LEFT: CONTENT (8 cols) ── */}
        <main id="main" className="lg:col-span-8 flex flex-col gap-10">
          {/* HERO / PROFILE HEADER */}
          <section className="border border-zinc-300 p-2 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-start p-4">
              <div className="shrink-0 mx-auto sm:mx-0">
                <div className="border border-zinc-300 p-1.5 bg-white rounded-full">
                  <picture>
                    <source srcSet="/assets/avatar.webp" type="image/webp" />
                    <img
                      src="/assets/avatar.jpg"
                      alt={d.home.avatarAlt}
                      width={384}
                      height={384}
                      fetchPriority="high"
                      className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover"
                    />
                  </picture>
                </div>
              </div>
              <div className="flex-grow text-center sm:text-left">
                <h1 className="font-serif-body font-black text-2xl md:text-3xl text-zinc-950 leading-tight">
                  {profile.name}
                </h1>
                <p className="font-mono text-sm text-red-700 font-semibold mt-1">
                  {profile.title}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 font-mono text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.email}
                  </span>
                  <a
                    href={`https://${profile.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 underline underline-offset-2 hover:text-black"
                  >
                    <GithubSvg className="w-3.5 h-3.5 text-zinc-400" />
                    {profile.github}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* BIO */}
          <section>
            <h2 className="font-mono font-black text-sm tracking-wider text-black border-b border-black pb-1.5 mb-4 uppercase flex items-center gap-2">
              <Award className="w-4 h-4" /> {t.sectionAbout}
            </h2>
            <div className="space-y-4 font-serif-body text-[15px] text-zinc-800 leading-relaxed text-justify">
              {profile.bio.map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* RESEARCH */}
          {profile.research.length > 0 && (
            <section>
              <h2 className="font-mono font-black text-sm tracking-wider text-black border-b border-black pb-1.5 mb-4 uppercase flex items-center gap-2">
                <FlaskConical className="w-4 h-4" /> {t.sectionResearch}
              </h2>
              <div className="space-y-6">
                {profile.research.map((r, idx) => (
                  <article
                    key={idx}
                    className="border border-zinc-200 rounded-lg bg-white p-4 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      <span className="font-mono text-[11px] text-zinc-500 font-semibold">
                        {r.period}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                        {r.status}
                      </span>
                    </div>

                    <h3 className="font-serif-body font-bold text-[17px] text-zinc-950 leading-snug">
                      {r.title}
                    </h3>
                    <p className="font-mono text-[11px] text-zinc-500 mt-1.5">{r.venue}</p>

                    <dl className="mt-3 space-y-2.5">
                      <div>
                        <dt className="font-mono font-bold text-[10px] uppercase tracking-wider text-zinc-800">
                          {t.researchQuestion}
                        </dt>
                        <dd className="font-serif-body text-[14px] text-zinc-700 leading-relaxed mt-0.5">
                          {r.question}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono font-bold text-[10px] uppercase tracking-wider text-zinc-800">
                          {t.researchMethod}
                        </dt>
                        <dd className="font-serif-body text-[14px] text-zinc-700 leading-relaxed mt-0.5">
                          {r.method}
                        </dd>
                      </div>
                    </dl>

                    <p className="font-mono text-[11px] text-zinc-600 leading-relaxed mt-3 pt-3 border-t border-dashed border-zinc-300">
                      {r.honestNote}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {r.keywords.map((k) => (
                        <span
                          key={k}
                          className="font-mono text-[10px] bg-zinc-50 border border-zinc-200 px-2 py-1 rounded text-zinc-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* SYSTEMS — công việc hiện tại, ẩn danh khách hàng */}
          {profile.systems.length > 0 && (
            <section>
              <h2 className="font-mono font-black text-sm tracking-wider text-black border-b border-black pb-1.5 mb-2 uppercase flex items-center gap-2">
                <Server className="w-4 h-4" /> {t.sectionSystems}
              </h2>
              <p className="font-mono text-[10.5px] text-zinc-500 mb-4">{t.systemsNote}</p>

              <div className="space-y-5">
                {profile.systems.map((s) => (
                  <article key={s.name} className="border-l-2 border-zinc-300 pl-4">
                    <h3 className="font-sans font-bold text-sm text-zinc-900">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline underline-offset-4 decoration-zinc-400"
                        >
                          {s.name}
                          <span className="font-mono text-[10px] text-zinc-400 ml-1.5">
                            {s.url.replace(/^https?:\/\//, "")} ↗
                          </span>
                        </a>
                      ) : (
                        s.name
                      )}
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
                      {s.domain}
                    </p>
                    <p className="font-serif-body text-[13.5px] text-zinc-700 leading-snug mt-1.5">
                      {s.summary}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {s.highlights.map((h) => (
                        <li
                          key={h}
                          className="font-serif-body text-[13px] text-zinc-600 leading-snug pl-3.5 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-400"
                        >
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {s.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="font-mono text-[9px] bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-500"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCE TIMELINE */}
          <section>
            <h2 className="font-mono font-black text-sm tracking-wider text-black border-b border-black pb-1.5 mb-4 uppercase flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> {t.sectionExperience}
            </h2>
            <div className="space-y-0">
              {profile.experiences.map((exp, idx) => (
                <div key={idx} className="relative pl-6 pb-5 border-l-2 border-zinc-200 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute left-[-7px] top-1 w-3 h-3 rounded-full bg-black border-2 border-white" />
                  <div className="ml-2">
                    {/* Compact header: period + title + company inline */}
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
                      <span className="font-mono text-[10px] font-semibold text-red-700 uppercase tracking-wider whitespace-nowrap">
                        {exp.period}
                      </span>
                      <h3 className="font-sans font-bold text-sm text-zinc-900">
                        {exp.title}
                      </h3>
                      <span className="font-mono text-[11px] text-zinc-400">
                        — {exp.company}
                      </span>
                    </div>
                    {/* Một câu: hệ thống là gì */}
                    <p className="font-serif-body text-[13.5px] text-zinc-700 leading-snug mb-2">
                      {exp.summary}
                    </p>
                    {/* Gạch đầu dòng: đã làm gì */}
                    {exp.highlights.length > 0 && (
                      <ul className="mb-2.5 space-y-1">
                        {exp.highlights.map((h) => (
                          <li
                            key={h}
                            className="font-serif-body text-[13px] text-zinc-600 leading-snug pl-3.5 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-400"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Tech badges (hide if empty, e.g., Military Service) */}
                    {exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {exp.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="font-mono text-[9px] bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-500"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EDUCATION */}
          <section>
            <h2 className="font-mono font-black text-sm tracking-wider text-black border-b border-black pb-1.5 mb-4 uppercase flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> {t.sectionEducation}
            </h2>
            {profile.education.map((edu, idx) => (
              <div key={idx} className="relative pl-6 pb-2 border-l-2 border-zinc-200">
                <div className="absolute left-[-7px] top-1 w-3 h-3 rounded-full bg-zinc-400 border-2 border-white" />
                <div className="ml-2">
                  <span className="font-mono text-[11px] text-zinc-500 font-semibold">
                    {edu.period}
                  </span>
                  <h3 className="font-sans font-bold text-base text-zinc-900 mt-0.5">
                    {edu.degree}
                  </h3>
                  <p className="font-mono text-xs text-zinc-500 mb-1">{edu.school}</p>
                  <p className="font-serif-body text-[14px] text-zinc-700 leading-relaxed">
                    {edu.description}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </main>

        {/* ── RIGHT: SIDEBAR (4 cols) ── */}
        <aside className="lg:col-span-4 lg:border-l lg:border-zinc-200 lg:pl-6 space-y-8">
          {/* SKILLS */}
          <section>
            <h2 className="font-mono font-bold text-xs tracking-wider text-black border-b border-zinc-400 pb-1 mb-4 uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4" /> {t.sectionSkills}
            </h2>
            <div className="space-y-4">
              {profile.skills.map((skillGroup) => (
                <div key={skillGroup.category}>
                  <h3 className="font-mono font-bold text-[11px] text-zinc-800 mb-1.5 uppercase tracking-wider">
                    {skillGroup.category}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGroup.items.map((skill) => (
                      <span
                        key={skill}
                        className="font-mono text-[10px] bg-white border border-zinc-200 px-2 py-1 rounded text-zinc-700 hover:border-zinc-400 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CONTACT CTA */}
          <section className="border border-zinc-200 rounded-lg p-4 bg-white shadow-2xs">
            <h3 className="font-sans font-bold text-sm text-zinc-950 mb-1">
              {t.workTogether}
            </h3>
            <p className="font-serif-body text-[12px] text-zinc-600 leading-relaxed mb-3">
              {t.contactBlurb}
            </p>
            <a
              href="mailto:phamkhanhminhman97@gmail.com"
              className="inline-block bg-black text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors uppercase text-center w-full"
            >
              {d.contact.sendEmail}
            </a>
          </section>

          {/* DOWNLOAD CV */}
          <section className="border border-zinc-200 rounded-lg p-4 bg-white shadow-2xs">
            <h3 className="font-sans font-bold text-xs text-zinc-950 mb-1">
              {t.cv}
            </h3>
            <p className="font-serif-body text-[11.5px] text-zinc-600 leading-relaxed mb-3">
              {t.cvBody}
            </p>
            {/* File tạo bởi tools/build-cv.py từ chính src/data/profile.tsx */}
            <a
              href="/cv/Pham-Khanh-Minh-Man-CV.pdf"
              download
              className="inline-block bg-black text-white font-mono text-[10px] font-bold px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors uppercase text-center w-full"
            >
              {t.cvButton}
            </a>
          </section>

          {/* NAVIGATION BACK TO MAIN SECTIONS */}
          <section>
            <h3 className="font-mono font-bold text-xs text-zinc-900 border-b border-zinc-200 pb-1 mb-3 uppercase">
              {t.quickLinks}
            </h3>
            <ul className="space-y-2 font-sans text-xs">
              <li>
                <Link
                  href="/#publications"
                  className="text-zinc-700 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  • Libraries & Packages
                </Link>
              </li>
              <li>
                <Link
                  href="/#blog"
                  className="text-zinc-700 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  • Technical Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/#contact"
                  className="text-zinc-700 hover:text-red-700 transition-colors flex items-center gap-1"
                >
                  • Contact Form
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {/* ── FOOTER ── */}
      <footer className="editorial-border-double mt-12 py-6 text-center font-mono text-[10px] text-zinc-500">
        <div>&copy; {new Date().getFullYear()} {SITE_DOMAIN}. All rights reserved.</div>
        <p className="mx-auto mt-3 max-w-2xl px-4 leading-relaxed">
          {d.footer.privacy}
        </p>
      </footer>
    </div>
  );
}
