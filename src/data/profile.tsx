// ─── Profile Data for About Page ───────────────────────────────────────────

/** Một dự án (hoặc một nhóm việc) trong một công ty. */
export interface Project {
  name: string;
  /** Bỏ trống khi dự án kéo dài theo cả thời gian ở công ty. */
  period?: string;
  /** MỘT câu: hệ thống đó là gì. Không kể lể. */
  summary?: string;
  /** 1-3 gạch đầu dòng: mình đã LÀM gì, ưu tiên thứ đo được. */
  highlights: string[];
  technologies: string[];
}

/**
 * Một công ty, các dự án nằm bên dưới.
 *
 * Gộp theo công ty để người đọc thấy ba năm ở Devtify là ba năm ở MỘT chỗ,
 * không phải ba lần nhảy việc, và các dự án chồng thời gian không trông như
 * hai công việc cùng lúc.
 */
export interface Experience {
  company: string;
  title: string;
  period: string;
  summary?: string;
  projects: Project[];
}

/** Hệ thống đang làm — mô tả kỹ thuật, KHÔNG nêu tên khách hàng. */
export interface SystemWork {
  name: string;
  domain: string;
  /** Chỉ dự án CÔNG KHAI mới có link. Dự án khách hàng để trống. */
  url?: string;
  summary: string;
  highlights: string[];
  technologies: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface Education {
  period: string;
  degree: string;
  school: string;
  description: string;
}

export interface Research {
  period: string;
  status: string;
  /** Giữ nguyên tiếng Anh — tên đề tài là danh từ riêng của công trình. */
  title: string;
  venue: string;
  question: string;
  method: string;
  honestNote: string;
  keywords: string[];
}

export interface ProfileData {
  name: string;
  /**
   * Cách viết khác của CHÍNH cái tên đó — không phải biệt danh cho vui.
   *
   * Người Việt gõ tìm kiếm trên điện thoại hầu như không bỏ dấu, nên "pham
   * khanh minh man" là truy vấn thật sự phổ biến hơn bản có dấu. Google KHÔNG
   * tự suy ra hai chuỗi đó là một người nếu bản không dấu chưa từng xuất hiện
   * trong nội dung trang. Liệt kê ở đây để chúng vào được cả JSON-LD
   * (alternateName) lẫn phần chữ hiển thị.
   */
  alternateNames: string[];
  title: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  bio: string[];
  experiences: Experience[];
  skills: Skill[];
  education: Education[];
  systems: SystemWork[];
  research: Research[];
}

export const profile: ProfileData = {
  name: "Phạm Khánh Minh Mẫn",
  alternateNames: ["Pham Khanh Minh Man", "PKMM"],
  title: "Backend Engineer · E-commerce API Integration · LLM-Agent Memory Research",
  location: "Da Nang, Vietnam",
  email: "phamkhanhminhman97@gmail.com",
  github: "https://github.com/phamkhanhminhman97",
  linkedin: "https://www.linkedin.com/in/pkmm97",
  bio: [
    "Backend engineer with 5+ years in e-commerce, payments and multi-marketplace API integration, mostly in NestJS and TypeScript with event-driven work on AWS. Author of four open-source client libraries for the Shopee, TikTok Shop and Lazada Open APIs, published on npm.",
    "Since 2026, a graduate student in Computer Science (research track) at Danang University of Science and Technology, interested in memory for LLM agents.",
  ],
  experiences: [
    {
      company: "DiproTech",
      title: "Backend Developer",
      period: "07/2025 —",
      summary: "Backend for Japanese clients, often several projects at once. Client names withheld under contract.",
      projects: [
        {
          name: "Publishing platform: subscriptions",
          period: "08/2026 —",
          summary: "Rails billing on Stripe and PayPal side by side, plus passkey sign-in in the shared Cognito auth library.",
          highlights: [
            "Wrote the upgrade calculator (several Single plans → All-in-one, prorated) as plain Ruby, testable without a database or gateway. Checking it against the client's 28 spec cases found 14 miscalculated in the spec itself.",
            "Gateways redeliver webhooks, so each upgrade or plan switch is claimed by one conditional UPDATE and applied exactly once.",
            "Receipt PDFs in Japanese and English, stored by receipt number; the row and the upload share a transaction, so a failed upload retries without leaving an orphan.",
          ],
          technologies: ["Ruby on Rails 8", "PostgreSQL", "Stripe", "PayPal", "Sidekiq", "RSpec", "AWS Cognito", "Heroku"],
        },
        {
          name: "Virtual factory: scheduling & simulation",
          period: "08/2025 —",
          summary: "Django services for production scheduling, a line simulator and OPC-UA equipment links, sharing one models package.",
          highlights: [
            "Schedule generation takes a Redis lock, so two triggers cannot build the same schedule twice.",
            "Cycle-time aggregation on Celery, bulk lot approval in one atomic transaction, and a GraphQL client that keeps lot and schedule deletions in sync with an external production system.",
            "Carried the Container → Carrier schema change through the shared models wheel, and added quantity-based batch equipment to the simulator and the Java OPC-UA client.",
          ],
          technologies: ["Python", "Django", "Celery", "Redis", "PostgreSQL", "Java", "OPC-UA", "GraphQL"],
        },
        {
          name: "Social App",
          period: "12/2025 — 05/2026",
          summary: "Newsfeed and content distribution, team of 10. Backend started from an empty repo.",
          highlights: [
            "Shuffled feed ordered by a hash of a per-user hourly seed and the post id: cursor pagination stays stable without storing any order.",
            "Deploy path: dev and staging on Docker Compose, production on ECS with a task definition per service, so one service ships without touching the others. Buildx layer cache, images tagged by commit SHA.",
          ],
          technologies: ["NestJS", "TypeScript", "PostgreSQL", "Redis", "AWS ECS / ECR / S3", "GitHub Actions", "Docker Buildx"],
        },
        {
          name: "Aptitude-test study app",
          period: "07/2025 — 10/2025",
          highlights: [
            "Moved the backend from PostgreSQL to Firestore; question bank, topic progress, phone-OTP sign-in.",
            "Exams draw so every topic is represented; progress stats update incrementally instead of recomputing the category, with Redis caching stats and exam history.",
          ],
          technologies: ["Python", "FastAPI", "Firestore", "Firebase Auth", "Redis", "Cloud Build"],
        },
      ],
    },
    {
      company: "Devtify Technologies",
      title: "Backend Developer",
      period: "04/2022 — 06/2025",
      projects: [
        {
          name: "PaymentShield",
          period: "01/2025 — 06/2025",
          summary: "Auto loan service between lenders, dealers and customers, team of 7.",
          highlights: [
            "Started the codebase: NestJS, Docker, PostgreSQL, layered by responsibility.",
            "Webhooks publish to SQS and Lambda consumes them, so a slow downstream cannot block the callback.",
            "Failed jobs retry with backoff and land in a DLQ instead of disappearing.",
          ],
          technologies: ["NestJS", "TypeScript", "PostgreSQL", "AWS Lambda", "AWS SQS", "BullMQ", "Redis"],
        },
        {
          name: "ROUTINE",
          period: "01/2024 — 03/2025",
          summary: "Orders, inventory and refunds unified across Shopee, Lazada and TikTok Shop, team of 10.",
          highlights: [
            "One order model over three marketplaces, each with its own API shape and failure modes.",
            "Kept stock and finance in step with the NaviWorld ERP.",
            "Integrated three payment gateways and three shipping providers.",
          ],
          technologies: ["NestJS", "TypeScript", "PostgreSQL", "Redis", "Elasticsearch", "BullMQ", "Shopee API", "TikTok Shop API", "Lazada API"],
        },
        {
          name: "BEAUTYBOX / THEFACESHOP / REEBOK",
          period: "04/2022 — 11/2023",
          summary: "Retail digital transformation for HSVGroup, team of 15.",
          highlights: ["Designed the database and REST API."],
          technologies: ["NestJS", "TypeScript", "PostgreSQL", "Redis", "AWS EC2", "Docker"],
        },
      ],
    },
    {
      company: "Vietnam People's Army",
      title: "Military Service",
      period: "01/2020 — 01/2022",
      summary: "Completed compulsory military service.",
      projects: [],
    },
    {
      company: "D-SOFT JSC",
      title: "Backend Developer",
      period: "03/2019 — 12/2019",
      projects: [
        {
          name: "SunWorld B2B Ticket",
          summary: "Ticket selection, online payment and e-ticket storage, team of 7.",
          highlights: ["Designed and built the REST API on PHP / Laravel / SQL Server."],
          technologies: ["PHP", "Laravel", "SQL Server"],
        },
      ],
    },
  ],
  skills: [
    {
      category: "Programming languages",
      items: ["TypeScript", "JavaScript", "Python", "PHP", "Ruby"],
    },
    {
      category: "Backend Frameworks",
      items: ["NestJS", "Express", "Laravel", "Ruby on Rails", "Django", "FastAPI"],
    },
    {
      category: "Databases & Search",
      items: ["PostgreSQL", "Redis", "Elasticsearch", "SQL Server", "Firestore"],
    },
    {
      category: "Queues & Background Jobs",
      items: ["BullMQ", "AWS SQS + DLQ", "Sidekiq"],
    },
    {
      category: "Cloud & DevOps",
      items: [
        "AWS EC2 / S3 / ECS / ECR / Lambda / Cognito",
        "Cloudflare Workers / R2 / D1",
        "Docker",
        "GitHub Actions",
        "GitLab CI",
        "Linux",
      ],
    },
    {
      category: "Testing",
      items: ["RSpec", "Vitest", "pytest", "Golden-vector regression tests"],
    },
    {
      category: "Payment Integrations",
      items: [
        "Stripe (Checkout, Subscriptions, Webhooks)",
        "PayPal Subscriptions",
        "Fundiin",
        "Payoo",
        "ZaloPay",
        "Recurring billing & proration",
        "Webhook idempotency",
        "Invoicing & consumption tax (適格請求書)",
      ],
    },
    {
      category: "E-commerce Marketplaces",
      items: ["Shopee Open API v2", "TikTok Shop API v2", "Lazada Open Platform"],
    },
    {
      category: "Shipping & ERP",
      items: ["GHN", "Ahamove", "TikiNOW", "NaviWorld ERP"],
    },
    {
      category: "Frontend",
      items: ["React", "Next.js", "Nuxt"],
    },
  ],
  systems: [
    {
      name: "BattleCatsLab",
      domain: "Personal project · public",
      url: "https://battlecatslab.fun",
      summary: "Data and simulation site for a mobile game — 9,000 generated pages, a deterministic battle engine, and server-authoritative realtime PvP.",
      highlights: [
        "Server owns the sim and ticks it at 30 Hz; clients send deploy intents and render snapshots, so a client cannot fake a result.",
        "Ranked ELO gate treats same-IP as telemetry only — shared Wi-Fi must not invalidate a real match; the abuse lockout derives from an append-only log, not a mutable counter.",
        "A golden-vector test pins fixed team pairs to their exact winner and frame count, so an engine change that would desync stored replays fails CI instead of corrupting them silently.",
      ],
      technologies: ["TypeScript", "React", "Vite", "SQLite", "Cloudflare Workers", "Cloudflare R2", "SSE"],
    },
  ],
  education: [
    {
      period: "2026 — present",
      degree: "M.Sc. in Computer Science",
      school: "Danang University of Science and Technology (DUT) — The University of Danang",
      description: "Research track. Coursework in progress; thesis topic not yet decided.",
    },
    {
      period: "2015 — 2019",
      degree: "B.Sc. in Information Technology",
      school: "University of Science and Education — The University of Danang",
      description: "Major in Information Technology.",
    },
  ],
  research: [
    {
      period: "2026 — present",
      status: "Exploratory — no published results",
      title:
        "When Does Graph Memory Help Beyond Verbalized Relations? Isolating Representation from Structure in LLM-Agent Memory",
      venue: "Independent research — not committed as a thesis topic",
      question:
        "Graph memory is widely believed to help LLM agents remember better. But when graph memory is compared against flat memory, existing work changes TWO things at once: structure (the ability to traverse relations) and representation (information rewritten as typed relational sentences — unavoidable, because an LLM can only read text). So which of the two does the observed benefit belong to?",
      method:
        "Verbalize-control: three token-budget-matched conditions drawing from the same candidate edge pool and differing only in the selector — graph traversal, cosine truncated to the budget, and dump-everything. Plus a degree-preserving shuffled-edge control to separate “these particular edges” from “merely having a graph”. The design is pre-registered, evaluated on an external non-circular benchmark, and specifies the negative branch in advance (TOST equivalence testing).",
      honestNote:
        "Status, stated plainly: this is something I work on outside of client work, not a committed thesis topic. A 30-question feasibility probe has been run; the quality gate fired and returned “inconclusive” rather than a result. No publishable numbers.",
      keywords: [
        "LLM agent memory",
        "Knowledge graph",
        "Retrieval",
        "Ablation study",
        "Pre-registration",
        "Cluster-aware statistics",
      ],
    },
  ],
};
