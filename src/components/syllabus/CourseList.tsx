"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { LessonSummary } from "@/data/syllabus/types";
import { copy } from "@/content/copy";
import { readPosition, subscribePosition } from "./reading-position";

const t = copy.syllabus;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

export default function CourseList({ lessons, base }: { lessons: LessonSummary[]; base: string }) {
  const [query, setQuery] = useState("");
  const saved = useSyncExternalStore(subscribePosition, readPosition, () => "");
  const [slug, anchor] = saved.split("#");
  const last = lessons.find((lesson) => lesson.slug === slug);
  const safeAnchor = anchor?.startsWith("section-") ? `#${encodeURIComponent(anchor)}` : "";
  const matches = lessons.filter((lesson) => normalize(`${lesson.number} ${lesson.title} ${lesson.description}`).includes(normalize(query.trim())));

  return (
    <section aria-label={t.lessons}>
      {last && <div className="sy-resume"><div><span className="sy-eyebrow">{t.resume}</span><p>{t.lesson} {last.number} · {last.title}</p><small>{t.deviceOnly}</small></div><Link className="sy-button" href={`${base}/${last.slug}${safeAnchor}`} prefetch={false}>{t.continue} →</Link></div>}
      <div className="sy-list-heading"><h2>{t.lessons}</h2><span>{lessons.length} {t.lessonUnit}</span></div>
      <label className="sy-search"><span>{t.search}</span><input type="search" placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <p className="sy-search-status" role="status">{query && `${matches.length} ${t.results}`}</p>
      <ol className="sy-lessons">
        {matches.map((lesson) => <li key={lesson.slug}>
          <Link href={`${base}/${lesson.slug}`} prefetch={false} className="sy-lesson-link">
            <span className="sy-number">{String(lesson.number).padStart(2, "0")}</span>
            <div><h3>{lesson.title}</h3><p>{lesson.description}</p><span className="sy-lesson-meta">{t.readLesson}{lesson.pdf && ` · ${t.handwrittenPdf}`} <span aria-hidden="true">↗</span></span></div>
          </Link>
          {lesson.pdf && <a href={lesson.pdf} target="_blank" rel="noopener noreferrer" className="sy-pdf-short" aria-label={`${t.openPdf} · ${t.lesson} ${lesson.number}`}>PDF ↗</a>}
        </li>)}
      </ol>
      {!matches.length && <p className="sy-empty">{t.noResults}</p>}
    </section>
  );
}
