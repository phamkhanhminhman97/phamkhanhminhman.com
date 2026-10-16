import { readFile, writeFile, mkdir, stat, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { coursePath, courseSource, lessons } from "./syllabus-catalog.mjs";
import { renderMarkdown } from "./syllabus-markdown.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.resolve(process.env.SYLLABUS_SOURCE_DIR || path.join(root, "../../study/self/ai-foundations"));
const output = path.join(root, "src/data/syllabus/linear-algebra.json");
const pdfDir = path.join(root, "public", coursePath);
const hash = (data) => createHash("sha256").update(data).digest("hex");

async function validateSnapshot(snapshot) {
  if (snapshot.version !== 1 || snapshot.lessons.length !== lessons.length || !snapshot.overview.html) throw new Error("Invalid syllabus snapshot");
  for (const [index, item] of snapshot.lessons.entries()) {
    if (item.slug !== lessons[index].slug || !item.html || !item.sourceHash || !item.toc.length) throw new Error("Incomplete syllabus snapshot");
    if (item.pdf) {
      const bytes = await readFile(path.join(root, "public", item.pdf));
      if (hash(bytes) !== item.pdfHash) throw new Error(`PDF snapshot differs: ${item.slug}`);
    }
  }
}

let hasSource = false;
try { await access(path.join(source, courseSource)); hasSource = true; } catch { /* standalone checkout */ }
if (!hasSource) {
  if (process.env.SYLLABUS_SOURCE_DIR) throw new Error("SYLLABUS_SOURCE_DIR does not contain the approved course");
  await validateSnapshot(JSON.parse(await readFile(output, "utf8")));
  console.log("Syllabus: using checked-in snapshot (source repository absent).");
} else {
  let previous;
  try { previous = JSON.parse(await readFile(output, "utf8")); } catch { /* first export */ }
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(pdfDir, { recursive: true });
  async function compile(file, old) {
    const full = path.join(source, courseSource, file);
    const markdown = await readFile(full, "utf8");
    const sourceHash = hash(markdown);
    let updated;
    if (old?.sourceHash === sourceHash) updated = old.updated;
    else {
      // A checkout's mtime is not a publication date. Prefer Git for clean sources.
      const relative = `${courseSource}/${file}`;
      const dirty = execFileSync("git", ["status", "--porcelain", "--", relative], { cwd: source, encoding: "utf8" }).trim();
      const committed = execFileSync("git", ["log", "-1", "--format=%cI", "--", relative], { cwd: source, encoding: "utf8" }).trim();
      updated = dirty || !committed ? (await stat(full)).mtime.toISOString() : committed;
    }
    return { ...(await renderMarkdown(markdown)), sourceHash, updated };
  }
  const compiled = [];
  for (const item of lessons) {
    const old = previous?.lessons.find((lesson) => lesson.slug === item.slug);
    const content = await compile(item.file, old);
    let pdf = null, pdfHash = null;
    if (item.pdfFile) {
      const origin = path.join(source, "summaries", item.pdfFile);
      const bytes = await readFile(origin);
      if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error(`Invalid PDF: ${item.pdfFile}`);
      pdf = `${coursePath}/${item.pdfFile}`;
      pdfHash = hash(bytes);
      await copyFile(origin, path.join(pdfDir, item.pdfFile));
      if (old?.pdfHash !== pdfHash) content.updated = new Date(Math.max(new Date(content.updated).getTime(), (await stat(origin)).mtimeMs)).toISOString();
    }
    compiled.push({ slug: item.slug, number: item.number, title: item.title, description: item.description, ...content, pdf, pdfHash });
  }
  const overview = await compile("README.md", previous?.overview);
  const snapshot = { version: 1, overview, lessons: compiled };
  await validateSnapshot(snapshot);
  await writeFile(output, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Syllabus: ${compiled.length} lessons, ${compiled.filter((lesson) => lesson.pdf).length} handwritten PDFs exported.`);
}
