import type { Heading } from "@/data/syllabus/types";
import { copy } from "@/content/copy";

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  return <nav aria-label={copy.syllabus.inThisLesson} className="sy-toc"><ol>{headings.map((heading) => <li key={heading.id} className={heading.depth === 3 ? "sy-toc-sub" : undefined}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol></nav>;
}
