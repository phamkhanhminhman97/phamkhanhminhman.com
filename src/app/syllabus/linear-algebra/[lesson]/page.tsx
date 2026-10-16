import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lessons, coursePath } from "@/data/syllabus";
import { copy } from "@/content/copy";
import TableOfContents from "@/components/syllabus/TableOfContents";
import ReadingPosition from "@/components/syllabus/ReadingPosition";
import { alternatesFor, openGraphFor } from "@/lib/seo";

const t = copy.syllabus;
export const dynamicParams = false;
export function generateStaticParams() { return lessons.map((lesson) => ({ lesson: lesson.slug })); }
type Props = { params: Promise<{ lesson: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lesson: slug } = await params;
  const item = lessons.find((lesson) => lesson.slug === slug);
  if (!item) return {};
  const title = `${t.lesson} ${item.number}: ${item.title} · ${t.courseTitle}`;
  const path = `${coursePath}/${item.slug}`;
  return { title, description: item.description, alternates: alternatesFor(path), openGraph: { ...openGraphFor(path, title, item.description), locale: "vi_VN", type: "article", modifiedTime: item.updated }, twitter: { title, description: item.description } };
}

export default async function LessonPage({ params }: Props) {
  const { lesson: slug } = await params;
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index < 0) notFound();
  const item = lessons[index], previous = lessons[index - 1], next = lessons[index + 1];
  // key: client navigation between lessons reuses this tree; without it the
  // lesson menu and table of contents stay expanded on the next lesson.
  return <main id="main" className="sy-reader" key={item.slug}>
    <ReadingPosition slug={item.slug} />
    <div className="sy-reading-top"><Link className="sy-back" href={coursePath}>← {t.courseTitle}</Link><details className="sy-course-menu"><summary>{t.lesson} {item.number} / {lessons.length} ▾</summary><nav aria-label={t.lessons}>{lessons.map((lesson) => <Link key={lesson.slug} href={`${coursePath}/${lesson.slug}`} prefetch={false} aria-current={item.slug === lesson.slug ? "page" : undefined}>{String(lesson.number).padStart(2, "0")} · {lesson.title}</Link>)}</nav></details></div>
    <header className="sy-lesson-header"><p className="sy-eyebrow">{t.courseNumber} / {t.lesson} {String(item.number).padStart(2, "0")}</p><h1>{item.title}</h1><p className="sy-intro">{item.description}</p>
      {item.pdf ? <div className="sy-pdf-bar"><div><strong>{t.handwrittenPdf}</strong><p>{t.pdfDescription}</p></div><div className="sy-pdf-actions"><a className="sy-button" href={item.pdf} target="_blank" rel="noopener noreferrer">{t.openPdf} ↗</a><a href={item.pdf} download>{t.download} ↓</a></div></div> : <p className="sy-pdf-pending">{t.pdfPending}</p>}
    </header>
    <div className="sy-reader-grid"><aside className="sy-desktop-toc"><p className="sy-eyebrow">{t.inThisLesson}</p><TableOfContents headings={item.toc} /></aside><div className="sy-article-column">
      <details className="sy-mobile-toc"><summary>{t.inThisLesson} ↓</summary><TableOfContents headings={item.toc} /></details>
      {item.unavailable.length > 0 && <p className="sy-unavailable-note">{t.unavailableNote}</p>}
      <article id="lesson-content" className="sy-prose" dangerouslySetInnerHTML={{ __html: item.html }} />
      <nav className="sy-prev-next" aria-label={t.lessonNavigation}>{previous ? <Link href={`${coursePath}/${previous.slug}`} prefetch={false}><span>← {t.previous}</span><strong>{previous.title}</strong></Link> : <Link href={coursePath}><span>← {t.overviewShort}</span><strong>{t.courseTitle}</strong></Link>}{next ? <Link href={`${coursePath}/${next.slug}`} prefetch={false}><span>{t.next} →</span><strong>{next.title}</strong></Link> : <Link href={`${coursePath}#course-review`}><span>{t.review} →</span><strong>{t.courseTitle}</strong></Link>}</nav>
      <p className="sy-reading-note">{t.deviceOnly}</p>
    </div></div>
  </main>;
}
