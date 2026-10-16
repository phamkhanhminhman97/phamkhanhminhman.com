// Server pages only. Client components receive summaries, never the full corpus.
import snapshot from "./linear-algebra.json";
import type { LessonSummary } from "./types";

export const coursePath = "/syllabus/linear-algebra";
export const lessons = snapshot.lessons;
export const overview = snapshot.overview;
export const courseUpdated = [overview.updated, ...lessons.map((lesson) => lesson.updated)]
  .reduce((latest, value) => Date.parse(value) > Date.parse(latest) ? value : latest);
export const summaries: LessonSummary[] = lessons.map(({ slug, number, title, description, pdf }) => ({ slug, number, title, description, pdf }));
