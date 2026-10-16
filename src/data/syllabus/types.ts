export interface LessonSummary {
  slug: string;
  number: number;
  title: string;
  description: string;
  pdf: string | null;
}
export interface Heading { id: string; title: string; depth: number }
