/**
 * Every string the UI renders. The site is English-only: there is no locale
 * parameter, no dictionary lookup, and no translated variant to keep in sync.
 */
import { SITE_DOMAIN } from "@/lib/site";

export const copy = {
  nav: {
    publications: "PUBLICATIONS & SDKS",
    research: "RESEARCH",
    about: "ABOUT & EXPERIENCE",
    blog: "TECHNICAL BLOG",
    contact: "CONTACT & LINKS",
    backToHome: "Back to Home",
  },
  home: {
    metaTitle:
      "Phạm Khánh Minh Mẫn — Backend Engineer & LLM-Agent Memory Research",
    metaDescription:
      "Backend engineer (NestJS, PostgreSQL, Redis, AWS) with 5+ years in e-commerce, author of the open-source Shopee / TikTok Shop / Lazada API clients. Graduate researcher on graph memory for LLM agents at Danang University of Science and Technology.",
    kicker: "API INTEGRATION • E-COMMERCE AUTOMATION • APPLIED AI RESEARCH",
    heroAlt: "Pixel-art illustration of a developer workspace",
    avatarAlt: "Portrait of Phạm Khánh Minh Mẫn",
    intro: [
      "Backend engineer, 5+ years on e-commerce systems and multi-marketplace API integration.",
      "I write and maintain open-source clients for the Shopee, TikTok Shop and Lazada Open APIs — request signing, token refresh, webhooks.",
      "Currently at DiproTech on manufacturing simulation, subscription billing and content platforms for Japanese clients. Since 2026, a graduate student in Computer Science at Danang University of Science and Technology.",
    ],
    sectionPackages: "REPRESENTATIVE LIBRARIES & PACKAGES",
    sectionPackagesNote: "[ Last week stats from npmjs.org ]",
    sectionResearch: "RESEARCH — GRADUATE WORK",
    sectionResearchNote: "[ In progress ]",
    sectionBlog: "TECHNICAL ARTICLES & GUIDES",
    sectionBlogNote: "[ Notes from production systems ]",
    fullMethod: "Full method & status →",
    perWeek: "/week",
    coreTechStack: "Core Tech Stack",
    openSourceStats: "Open Source Stats",
    githubRepos: "GitHub Repos",
    npmPackages: "npm Packages",
    weeklyDownloads: "Weekly Downloads",
    repos: "repos",
    packages: "packages",
    latestUpdates: "Latest Updates",
    /**
     * Mục "Latest updates" giờ sinh từ registry npm, nên ở đây chỉ còn phần
     * chữ cố định. Danh sách cũ gõ tay đã trôi khỏi sự thật: nó công bố
     * "TIKTOK-API-CLIENT V1.3.0" trong khi gói thật tên
     * `tiktokshops-api-client` và mới ở 1.1.0.
     */
    released: "Released",
    viewOnNpm: "View on npm →",
    updatesLoading: "Loading from npm…",
    details: "Details →",
    /** Nút nhỏ dưới đồng hồ, dừng hoặc chạy lại lớp hạt trôi sau header. */
    motionPause: "Pause animation",
    motionPlay: "Play animation",
  },
  about: {
    /**
     * Title đầy đủ, dùng ở dạng `absolute` (xem app/about/page.tsx).
     *
     * Trang /about là bản CV đầy đủ nhất trên site, nên nó là ứng viên số hai
     * sau trang chủ cho một truy vấn thuần tên riêng. Title cũ "About &
     * Research" không chứa tên nên tự loại mình khỏi cuộc đua đó.
     *
     * Kèm luôn bản không dấu trong ngoặc: đó là cách gõ phổ biến nhất từ điện
     * thoại, và Google không tự nối hai chuỗi đó lại nếu bản không dấu chưa
     * từng xuất hiện ở đâu trên trang.
     */
    metaTitle: "Phạm Khánh Minh Mẫn (Pham Khanh Minh Man) — CV, Backend Engineer",
    metaDescription:
      "Curriculum vitae of Phạm Khánh Minh Mẫn — backend engineer (NestJS, PostgreSQL, Redis, AWS) and graduate researcher on graph memory for LLM agents.",
    breadcrumb: `${SITE_DOMAIN} / about`,
    sectionAbout: "About",
    sectionResearch: "Research",
    sectionSystems: "Selected systems",
    sectionExperience: "Experience",
    sectionEducation: "Education",
    sectionSkills: "Skills",
    systemsNote:
      "Built outside client work; public and linked.",
    cv: "Curriculum Vitae",
    cvBody:
      "Work history, selected systems, open-source packages, skills, education and research, on two A4 pages.",
    cvButton: "Download CV (PDF)",
    quickLinks: "Quick Links",
    contactBlurb:
      "Always happy to discuss e-commerce integration work, automation, or open-source collaboration.",
    workTogether: "Let's Work Together",
    researchQuestion: "Question",
    researchMethod: "Method",
  },
  contact: {
    heading: "Leave a Message",
    name: "Your Name",
    email: "Your Email",
    message: "Message",
    namePlaceholder: "Jane Doe",
    emailPlaceholder: "name@example.com",
    messagePlaceholder: "I would like to discuss…",
    submit: "Send message",
    subject: `New contact from ${SITE_DOMAIN}`,
    disabledNote: "The contact form is not configured yet. Email me directly:",
    sendEmail: "Email me",
    sending: "Sending…",
    sent: "Thanks — your message is on its way. I'll reply to the address you gave.",
    failed: "Could not send. Please email me directly:",
    orEmail: "or email directly",
  },
  notFound: {
    title: "Page not found",
    home: "Back to home",
    about: "About",
  },
  blog: {
    author: "Author",
    authorBio:
      "Backend engineer working on e-commerce automation, subscription billing and multi-marketplace API integration (Shopee, TikTok Shop, Lazada).",
    otherPosts: "Other posts",
    ctaTitle: "Need an integration?",
    ctaBody:
      "If you are building order or inventory sync against Shopee, TikTok Shop or Lazada, get in touch.",
    ctaButton: "Email me",
  },
  footer: {
    rights: "All rights reserved.",
    built: "Editorial-academic design. Hosted on Cloudflare.",
  },
  weather: {
    error: "Failed to load weather:",
    clear: "Clear",
    fair: "Fair",
    cloudy: "Cloudy",
    fog: "Fog",
    drizzle: "Drizzle",
    rain: "Rain",
    showers: "Showers",
    thunder: "Thunderstorm",
  },
} as const;

export type Copy = typeof copy;
