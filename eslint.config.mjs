import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Thư mục tạm của `wrangler dev`: chứa bundle sinh tự động (facade chèn
    // middleware) mà eslint chấm là "biến không dùng". Không phải mã của mình,
    // và .gitignore đã bỏ qua — nhưng eslint thì không đọc .gitignore, nên
    // chạy `wrangler dev` một lần là lint tự mọc thêm cảnh báo.
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
