type ProjectLink = { label: string; href: string; kind: "demo" | "github" | "here" };

type Project = {
  title: string;
  dates: string;
  summary: string;
  highlights?: string[];
  tags: string[];
  links: ProjectLink[];
};

const GITHUB_RECSYS = "https://github.com/Vu-Tran-1611/ecommerce-recommendation-system";

const FEATURED: Project = {
  title: "E-Commerce Platform with AI Services",
  dates: "2024 – Present",
  summary:
    "A full online shop where the recommendation system and the AI shopping assistant run as FastAPI services inside the platform, connecting ML models, LLM product search and agentic RAG support in one end-to-end system.",
  highlights: [
    "Product browsing, cart, wishlist, checkout, coupons and order workflows",
    "Customer, vendor and admin roles with authentication and role-based access",
    "Real-time customer–vendor chat",
  ],
  tags: ["Laravel", "MySQL", "FastAPI", "Tailwind CSS", "PyTorch", "LangChain"],
  links: [
    { label: "Live demo", href: "https://demo.fashion-shop.uk", kind: "demo" },
    { label: "GitHub", href: "https://github.com/Vu-Tran-1611/onlineshop", kind: "github" },
  ],
};

const OTHERS: Project[] = [
  {
    title: "Agentic AI Shopping Assistant",
    dates: "04/2026 – Present",
    summary:
      "An LLM shopping agent that calls e-commerce APIs to find products, plus agentic RAG over store policies (shipping, returns, warranty, payment) stored in Pinecone.",
    tags: ["LangChain", "Pinecone", "LLM tool calling", "RAG"],
    links: [{ label: "GitHub", href: GITHUB_RECSYS, kind: "github" }],
  },
  {
    title: "Product Recommendation System",
    dates: "10/2025 – 03/2026",
    summary:
      "Content-based KNN (TF-IDF + one-hot features), BERT4Rec, ComiRec and Two-Tower models for personalized recommendations, evaluated with Recall@K and NDCG@K.",
    tags: ["PyTorch", "scikit-learn", "Pandas"],
    links: [{ label: "GitHub", href: GITHUB_RECSYS, kind: "github" }],
  },
  {
    title: "Song Detector",
    dates: "2026",
    summary:
      "This site: a CNN trained on mel spectrograms identifies which of 10 songs is playing from a 10-second mic recording.",
    tags: ["PyTorch", "FastAPI", "Next.js"],
    links: [
      { label: "Try it", href: "#detector", kind: "here" },
      { label: "GitHub", href: "https://github.com/Vu-Tran-1611/CNN_Song_Detector", kind: "github" },
    ],
  },
];

function LinkIcon({ kind }: { kind: ProjectLink["kind"] }) {
  if (kind === "github") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    );
  }
  if (kind === "demo") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ProjectLinkButton({ link, primary = false, projectTitle }: { link: ProjectLink; primary?: boolean; projectTitle: string }) {
  const external = link.href.startsWith("http");
  return (
    <a
      href={link.href}
      aria-label={`${link.label}: ${projectTitle}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold transition-[box-shadow,color]",
        primary
          ? "bg-accent text-white shadow-[0_6px_16px_rgba(242,92,34,0.35)] hover:bg-accent-deep"
          : "text-ink shadow-[var(--shadow-soft-sm)] hover:text-accent-deep active:shadow-[var(--shadow-soft-inset)]",
      ].join(" ")}
    >
      <LinkIcon kind={link.kind} />
      {link.label}
    </a>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Technologies">
      {tags.map((tag) => (
        <li key={tag} className="rounded-lg bg-white/60 px-2.5 py-1 text-sm font-medium text-ink">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function Projects() {
  return (
    <section id="projects" aria-labelledby="projects-title" className="flex scroll-mt-24 flex-col gap-6">
      <h2 id="projects-title" className="text-2xl font-bold text-ink sm:text-3xl">
        Projects
      </h2>

      <article className="relative overflow-hidden rounded-[2rem] panel-texture p-6 text-panel-ink shadow-[var(--shadow-panel)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="font-lcd14 text-xs tracking-[0.25em] text-led-amber">★ FEATURED</p>
            <div>
              <h3 className="text-2xl font-bold sm:text-3xl">{FEATURED.title}</h3>
              <p className="mt-1 text-base text-panel-muted">{FEATURED.dates}</p>
            </div>
            <p className="text-lg leading-relaxed">{FEATURED.summary}</p>
            <ul className="flex flex-col gap-1.5 text-base text-panel-muted">
              {FEATURED.highlights?.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-2" aria-label="Technologies">
              {FEATURED.tags.map((tag) => (
                <li key={tag} className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-medium">
                  {tag}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3 lg:flex-col">
            {FEATURED.links.map((link, i) =>
              i === 0 ? (
                <ProjectLinkButton key={link.href} link={link} primary projectTitle={FEATURED.title} />
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.label}: ${FEATURED.title}`}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold text-panel-ink shadow-[var(--shadow-knob)] active:shadow-[var(--shadow-knob-pressed)]"
                >
                  <LinkIcon kind={link.kind} />
                  {link.label}
                </a>
              ),
            )}
          </div>
        </div>
      </article>

      <ul className="flex flex-col gap-4">
        {OTHERS.map((project) => (
          <li key={project.title}>
            <article className="flex flex-col gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)] sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-xl font-bold text-ink">{project.title}</h3>
                  <span className="text-base text-ink-muted">{project.dates}</span>
                </div>
                <p className="text-base leading-relaxed text-ink-muted">{project.summary}</p>
                <Tags tags={project.tags} />
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {project.links.map((link) => (
                  <ProjectLinkButton key={link.href} link={link} projectTitle={project.title} />
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
