import Link from "next/link";
import { copy } from "@/content/copy";
import "./syllabus.css";

export default function SyllabusLayout({ children }: { children: React.ReactNode }) {
  const t = copy.syllabus;
  return <div className="sy-shell" lang="vi">
    <header className="sy-site-header"><Link href="/" className="sy-wordmark">Phạm Khánh Minh Mẫn<span> / {t.brand}</span></Link><nav aria-label={t.navigation}><Link href="/syllabus">{t.allCourses}</Link><Link href="/notes">Study notes ↗</Link></nav></header>
    {children}
    <footer className="sy-footer"><span>{t.footer}</span><Link href="/syllabus">{t.allCourses} ↑</Link></footer>
  </div>;
}
