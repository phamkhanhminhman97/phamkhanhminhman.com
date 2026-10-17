import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderMarkdown } from "./syllabus-markdown.mjs";
import { lessons, coursePath } from "./syllabus-catalog.mjs";

test("raw HTML, event handlers and javascript: links are removed", async () => {
  const { html } = await renderMarkdown(
    '# T\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))\n',
  );
  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
  assert.doesNotMatch(html, /href=""/);
});

test("relative links point at published lessons; unpublished ones are labelled", async () => {
  const { html, unavailable } = await renderMarkdown(
    "# T\n\n## Phần 1\n\n[a](bai-02-ma-tran-la-phep-bien-doi.md#phần-1) [b](../mon-08-nlp-transformer/README.md) [c](#phần-1) [d](bai-01.py)\n",
  );
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => decodeURIComponent(m[1]));
  assert.deepEqual(hrefs, [`${coursePath}/linear-transformations#section-phần-1`, "#section-phần-1"]);
  assert.equal(unavailable.length, 2);
  assert.equal((html.match(/class="syllabus-unavailable"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /chưa có trên web/);
  assert.doesNotMatch(html, /mon-08|bai-01\.py"/);
});

test("headings get section- ids and a table of contents; only the title is dropped", async () => {
  const { html, toc } = await renderMarkdown(
    "# Tiêu đề bài\n\n## Một\n\n### Một b\n\n```python\n# comment trong code\n```\n",
  );
  assert.doesNotMatch(html, /Tiêu đề bài/);
  assert.match(html, /# comment trong code/);
  assert.deepEqual(toc.map((h) => [h.id, h.depth]), [["section-một", 2], ["section-một-b", 3]]);
});

test("Unicode formulas, dollar signs and code fences stay as written", async () => {
  const { html } = await renderMarkdown("# T\n\nGiá $5 và $10; `softmax(QKᵀ/√d)·V` và cosθ = a·b / (|a||b|).\n");
  assert.match(html, /\$5 và \$10/);
  assert.match(html, /<code>softmax\(QKᵀ\/√d\)·V<\/code>/);
  assert.match(html, /cosθ = a·b/);
  assert.doesNotMatch(html, /katex/);
});

test("published snapshot has no local paths or scripts, and every lesson has its PDF", async () => {
  const text = await readFile(new URL("../src/data/syllabus/linear-algebra.json", import.meta.url), "utf8");
  const snapshot = JSON.parse(text);
  assert.doesNotMatch(text, /\/Users\/|<script|onerror=/i);
  assert.equal(snapshot.lessons.length, lessons.length);
  assert.deepEqual(snapshot.lessons.map((l) => l.pdf?.split("/").pop()), lessons.map((l) => l.pdfFile));
  assert.ok(lessons.every((l) => /^mon-02-bai-\d{2}-ghi-tay\.pdf$/.test(l.pdfFile)));
  assert.equal(new Set(lessons.map((l) => l.slug)).size, lessons.length);
  // Markdown that failed to parse shows up as stray asterisks on the page.
  for (const page of [snapshot.overview, ...snapshot.lessons]) {
    const prose = page.html.replace(/<pre>[\s\S]*?<\/pre>/g, "").replace(/<code>[\s\S]*?<\/code>/g, "").replace(/<[^>]+>/g, "");
    assert.doesNotMatch(prose, /\*/, `literal * in ${page.slug ?? "overview"}`);
  }
});

test("an escaped pipe inside code keeps a table cell whole", async () => {
  const { html } = await renderMarkdown("# T\n\n| a | b | c |\n|---|---|---|\n| x | `\\|v\\|` y | z |\n");
  const cells = [...html.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  assert.deepEqual(cells, ["x", "<code>|v|</code> y", "z"]);
});


