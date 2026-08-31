import type { Metadata } from "next";
import AboutPage from "@/components/AboutPage";
import { copy } from "@/content/copy";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { profile } from "@/data/profile";

const t = copy.about;

export const metadata: Metadata = {
  // `absolute`: t.metaTitle đã chứa sẵn tên, để template "%s — Phạm Khánh
  // Minh Mẫn" nối thêm lần nữa thì title bị lặp tên hai lần.
  title: { absolute: t.metaTitle },
  description: t.metaDescription,
  alternates: alternatesFor("/about"),
  openGraph: { ...openGraphFor("/about", t.metaTitle, t.metaDescription), type: "profile" },
};

export default function Page() {
  return (
    <>
      {/* ProfilePage: kiểu schema Google dành riêng cho "trang hồ sơ của một
          người". Nó trỏ về cùng @id Person đã khai ở layout gốc, nên Google đọc
          được rằng trang chủ và trang này mô tả CÙNG một người thay vì hai thực
          thể rời rạc — thứ giúp gom tín hiệu về một mối thay vì chia đôi. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "@id": `${SITE_URL}/about#profilepage`,
            url: `${SITE_URL}/about`,
            name: t.metaTitle,
            description: t.metaDescription,
            inLanguage: "en",
            mainEntity: { "@id": `${SITE_URL}/#person` },
            about: { "@id": `${SITE_URL}/#person` },
            isPartOf: { "@id": `${SITE_URL}/#website` },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: profile.name,
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "About",
                  item: `${SITE_URL}/about`,
                },
              ],
            },
          }),
        }}
      />
      <AboutPage />
    </>
  );
}
