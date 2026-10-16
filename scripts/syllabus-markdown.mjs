import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import path from "node:path";
import { coursePath, lessons } from "./syllabus-catalog.mjs";

const routes = new Map(lessons.map((lesson) => [lesson.file, `${coursePath}/${lesson.slug}`]));
routes.set("README.md", coursePath);
const textOf = (node) => node.value ?? (node.children ?? []).map(textOf).join("");

/**
 * No raw HTML or local images; relative links are restricted to published pages.
 * No LaTeX: the lessons write formulas as Unicode and code blocks, so a stray
 * "$" in prose (prices, shell prompts) must stay plain text.
 */
export async function renderMarkdown(markdown) {
  const toc = [];
  const unavailable = new Set();
  const file = await unified()
    .use(remarkParse).use(remarkGfm)
    .use(() => (tree) => {
      // Remove only the document's title, never headings inside fenced code.
      const first = tree.children.findIndex((node) => node.type === "heading" && node.depth === 1);
      if (first >= 0) tree.children.splice(first, 1);
    })
    .use(remarkRehype)
    .use(rehypeSanitize, defaultSchema)
    .use(rehypeSlug, { prefix: "section-" })
    .use(() => (tree) => {
      visit(tree, "element", (node) => {
        if (/^h[1-6]$/.test(node.tagName)) {
          if (/^h[23]$/.test(node.tagName)) toc.push({ id: node.properties.id, title: textOf(node), depth: Number(node.tagName[1]) });
        }
        if (node.tagName === "img") {
          node.tagName = "span";
          node.children = [{ type: "text", value: node.properties.alt || "Hình trong tài liệu gốc" }];
          node.properties = {};
        }
        if (node.tagName !== "a") return;
        const href = String(node.properties.href ?? "");
        if (!href) return;
        if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return;
        const [rawPath, hash] = href.split("#");
        const normalized = path.posix.normalize(rawPath || ".");
        const route = !rawPath ? "" : routes.get(normalized);
        if (route !== undefined) {
          node.properties.href = route + (hash ? `#section-${hash.replace(/^section-/, "")}` : "");
        } else {
          unavailable.add(href);
          node.tagName = "span";
          // Plain text with a dotted underline; the lesson page explains it once.
          node.properties = { className: ["syllabus-unavailable"], title: "Tài liệu này chưa được đưa lên website" };
        }
      });
    })
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), toc, unavailable: [...unavailable] };
}
