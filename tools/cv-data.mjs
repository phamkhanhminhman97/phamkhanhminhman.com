/**
 * In ra JSON dữ liệu CV, đọc thẳng từ src/data/profile.tsx và projects.tsx.
 *
 * Tồn tại để CV PDF không phải một bản chép tay thứ hai của trang /about: sửa
 * profile.tsx rồi chạy lại tools/build-cv.py là CV khớp theo. Hai file dữ liệu
 * là TypeScript (projects.tsx còn có JSX cho icon), nên dịch tạm bằng chính
 * gói typescript trong node_modules rồi chạy như CommonJS; React được thay
 * bằng một bản giả vì CV không cần icon.
 *
 * Dùng: node tools/cv-data.mjs > cv.json   (build-cv.py tự gọi, không cần chạy tay)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(import.meta.url)(join(root, "node_modules/typescript"));

function load(rel) {
  const src = readFileSync(join(root, rel), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  const fakeReact = { createElement: () => null, Fragment: null };
  const mod = { exports: {} };
  const req = (name) => {
    if (name === "react") return fakeReact;
    throw new Error(rel + ': import "' + name + '" chưa được hỗ trợ trong cv-data.mjs');
  };
  new Function("require", "exports", "module", outputText)(req, mod.exports, mod);
  return mod.exports;
}

const { profile } = load("src/data/profile.tsx");
const { npmPackages } = load("src/data/projects.tsx");

process.stdout.write(
  JSON.stringify(
    {
      profile,
      packages: npmPackages.map(({ name, npmName, description, npmUrl }) => ({
        name,
        npmName,
        description,
        npmUrl,
      })),
    },
    null,
    2,
  ),
);
