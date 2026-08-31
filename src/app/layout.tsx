import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { profile } from "@/data/profile";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
});

const TITLE = "Phạm Khánh Minh Mẫn — Backend Engineer & LLM-Agent Memory Research";
const DESCRIPTION =
  "Backend engineer (NestJS, PostgreSQL, Redis, AWS) with 5+ years in e-commerce, author of the open-source Shopee / TikTok Shop / Lazada API clients. Graduate researcher on graph memory for LLM agents at Danang University of Science and Technology.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    // Tên thật, không phải "PKMM.ONLINE". Mỗi trang con (bài viết, dự án) là
    // một cơ hội để tên xuất hiện trong một <title> nữa; viết tắt tên miền thì
    // bỏ phí cơ hội đó vì "PKMM.ONLINE" không khớp với cách ai đó gõ tìm tên.
    template: "%s — Phạm Khánh Minh Mẫn",
  },
  description: DESCRIPTION,
  applicationName: "PKMM.ONLINE",
  authors: [{ name: profile.name, url: SITE_URL }],
  creator: profile.name,
  keywords: [
    "Phạm Khánh Minh Mẫn",
    "Pham Khanh Minh Man",
    "phamkhanhminhman",
    "PKMM",
    "Backend Developer Đà Nẵng",
    "NestJS",
    "Shopee API",
    "TikTok Shop API",
    "Lazada API",
    "LLM agent memory",
    "Graph memory",
    "Knowledge graph retrieval",
  ],
  openGraph: {
    type: "profile",
    locale: "en_US",
    url: SITE_URL,
    siteName: "PKMM.ONLINE",
    title: TITLE,
    description: DESCRIPTION,
    firstName: "Mẫn",
    lastName: "Phạm Khánh Minh",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

/** JSON-LD: thứ quyết định Google hiển thị bạn thế nào khi ai đó gõ đúng tên. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  // @id cố định biến khối này thành một thực thể có định danh, để các khối
  // JSON-LD khác (WebSite bên dưới) trỏ về đúng cùng một người thay vì mô tả
  // hai người trùng tên.
  "@id": `${SITE_URL}/#person`,
  name: profile.name,
  alternateName: profile.alternateNames,
  url: SITE_URL,
  email: `mailto:${profile.email}`,
  jobTitle: profile.title,
  description: DESCRIPTION,
  nationality: { "@type": "Country", name: "Vietnam" },
  worksFor: { "@type": "Organization", name: "DiproTech" },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Đà Nẵng",
    addressCountry: "VN",
  },
  sameAs: [profile.github, "https://www.npmjs.com/~phamkhanhminhman97"],
  alumniOf: profile.education.map((e) => ({
    "@type": "CollegeOrUniversity",
    name: e.school,
  })),
  knowsAbout: [
    ...profile.skills.flatMap((s) => s.items),
    ...profile.research.flatMap((r) => r.keywords),
  ],
};

/**
 * Khối WebSite, trỏ ngược về Person ở trên qua @id.
 *
 * Vì sao cần: Person một mình chỉ nói "có người tên này". WebSite + publisher
 * nói thêm "và đây là trang chính thức CỦA người đó" — đúng thứ Google cần để
 * chọn hiển thị site này cho một truy vấn thuần tên riêng, thay vì xếp sau các
 * hồ sơ mạng xã hội vốn có thẩm quyền tên miền cao hơn nhiều.
 */
const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: `${profile.name} — ${profile.title}`,
  alternateName: profile.alternateNames,
  description: DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#person` },
  about: { "@id": `${SITE_URL}/#person` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} antialiased`}>
      <body className="bg-[#faf9f6] text-[#1a1a1a] min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-black focus:text-white focus:px-3 focus:py-2 focus:rounded font-mono text-xs"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
