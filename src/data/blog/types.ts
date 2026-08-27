import React from "react";

/**
 * The site is English-only. Posts carry plain strings and one render function —
 * there is no locale variant to keep in sync.
 */
export interface BlogPost {
  slug: string;
  /** ISO `YYYY-MM-DD`, formatted for display at render time. */
  date: string;
  category: string;
  title: string;
  readTime: string;
  description: string;
  content: () => React.JSX.Element;
}
