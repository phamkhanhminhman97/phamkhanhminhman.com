import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";
import { summaries, overview, coursePath } from "@/data/syllabus";
import CourseList from "@/components/syllabus/CourseList";
import TransformationSketch from "@/components/syllabus/TransformationSketch";
import { SITE_URL } from "@/lib/site";
import { alternatesFor, openGraphFor } from "@/lib/seo";

const t = copy.syllabus;
export const metadata: Metadata = { title: t.courseTitle, description: t.courseDescription, alternates: alternatesFor(coursePath), openGraph: { ...openGraphFor(coursePath, t.courseTitle, t.courseDescription), locale: "vi_VN", type: "website" }, twitter: { title: t.courseTitle, description: t.courseDescription } };

export default function LinearAlgebraPage() {
  return <main id="main" className="sy-course">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Course", name: t.courseTitle, description: t.courseDescription, inLanguage: "vi", isAccessibleForFree: true, url: SITE_URL + coursePath, provider: { "@id": `${SITE_URL}/#person` }, hasPart: summaries.map((lesson) => ({ "@type": "LearningResource", name: lesson.title, url: `${SITE_URL}${coursePath}/${lesson.slug}`, position: lesson.number })) }).replace(/</g, "\\u003c") }} />
    <Link className="sy-back" href="/syllabus">← {t.allCourses}</Link>
    <div className="sy-course-hero"><div><p className="sy-eyebrow">{t.courseNumber} / LINEAR ALGEBRA</p><h1>{t.courseTitle}</h1><p className="sy-intro">{t.courseDescription}</p></div><TransformationSketch /></div>
    <div className="sy-course-facts"><span>{summaries.length} {t.lessonUnit}</span><span>{summaries.filter((lesson) => lesson.pdf).length} {t.handwrittenPdf}</span><span>{t.publicAccess}</span></div>
    <CourseList lessons={summaries} base={coursePath} />
    <details id="course-review" className="sy-overview"><summary>{t.overview}</summary><div className="sy-prose" dangerouslySetInnerHTML={{ __html: overview.html }} /></details>
  </main>;
}
