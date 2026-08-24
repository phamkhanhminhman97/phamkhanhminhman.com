import type { Metadata } from "next";

/**
 * Trang admin là client component nên không tự khai `metadata` được — Next chỉ
 * đọc `metadata` từ server component. Layout này tồn tại chỉ để gắn noindex.
 */
export const metadata: Metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
