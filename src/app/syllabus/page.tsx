import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";
import { lessons, coursePath } from "@/data/syllabus";
import { alternatesFor, openGraphFor } from "@/lib/seo";

const t = copy.syllabus;
export const metadata: Metadata = { title: t.hubTitle, description: t.hubDescription, alternates: alternatesFor("/syllabus"), openGraph: { ...openGraphFor("/syllabus", t.hubTitle, t.hubDescription), locale: "vi_VN", type: "website" }, twitter: { title: t.hubTitle, description: t.hubDescription } };

export default function SyllabusPage() {
  return <main id="main" className="sy-course sy-hub"><p className="sy-eyebrow">{t.kicker}</p><h1>{t.hubTitle}</h1><p className="sy-intro">{t.hubDescription}</p>
    <Link className="sy-course-card" href={coursePath}><div><span className="sy-eyebrow">{t.courseNumber}</span><h2>{t.courseTitle}</h2><p>{t.courseDescription}</p><span className="sy-lesson-meta">{lessons.length} {t.lessonUnit} · {lessons.filter((lesson) => lesson.pdf).length} {t.handwrittenPdf}</span></div><span aria-hidden="true">↗</span></Link>
    <p className="sy-muted">{t.hubScope}</p>
  </main>;
}
