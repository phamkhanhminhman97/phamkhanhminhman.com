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
  "Kỹ sư backend (NestJS, PostgreSQL, Redis, AWS) với 5+ năm kinh nghiệm thương mại điện tử, tác giả các thư viện mã nguồn mở Shopee / TikTok Shop / Lazada API. Đang làm thạc sĩ Khoa học Máy tính tại ĐH Bách khoa Đà Nẵng, nghiên cứu bộ nhớ đồ thị cho tác tử LLM.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — PKMM.ONLINE",
  },
  description: DESCRIPTION,
  applicationName: "PKMM.ONLINE",
  authors: [{ name: profile.name, url: SITE_URL }],
  creator: profile.name,
  keywords: [
    "Phạm Khánh Minh Mẫn",
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
    alternateLocale: ["vi_VN"],
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
  name: profile.name,
  alternateName: "PKMM",
  url: SITE_URL,
  email: `mailto:${profile.email}`,
  jobTitle: profile.title.en,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Đà Nẵng",
    addressCountry: "VN",
  },
  sameAs: [profile.github, "https://www.npmjs.com/~phamkhanhminhman97"],
  alumniOf: profile.education.map((e) => ({
    "@type": "CollegeOrUniversity",
    name: e.school.en,
  })),
  knowsAbout: [
    ...profile.skills.flatMap((s) => s.items),
    ...profile.research.flatMap((r) => r.keywords),
  ],
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
